import * as duckdb from "@duckdb/duckdb-wasm";

let db: duckdb.AsyncDuckDB | null = null;
let initPromise: Promise<duckdb.AsyncDuckDB> | null = null;

const HF_BASE = "https://huggingface.co/datasets/open-index/hacker-news/resolve/main/data";

// Use jsDelivr CDN for WASM bundles — most reliable with Next.js
const DUCKDB_BUNDLES = duckdb.getJsDelivrBundles();

export async function getDB(): Promise<duckdb.AsyncDuckDB> {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const bundle = await duckdb.selectBundle(DUCKDB_BUNDLES);
    const worker = await duckdb.createWorker(bundle.mainWorker!);
    const logger = new duckdb.ConsoleLogger();
    db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    return db;
  })();

  return initPromise;
}

// Generate parquet URLs for a range of months
function getParquetUrls(startYear: number, startMonth: number, endYear: number, endMonth: number): string[] {
  const urls: string[] = [];
  let y = startYear;
  let m = startMonth;
  while (y < endYear || (y === endYear && m <= endMonth)) {
    const mm = String(m).padStart(2, "0");
    urls.push(`'${HF_BASE}/${y}/${y}-${mm}.parquet'`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return urls;
}

// Get parquet URLs for last N months
function recentMonthUrls(months: number): string[] {
  const now = new Date();
  const end = { year: now.getFullYear(), month: now.getMonth() + 1 };
  const startDate = new Date(now);
  startDate.setMonth(startDate.getMonth() - months + 1);
  const start = { year: startDate.getFullYear(), month: startDate.getMonth() + 1 };
  return getParquetUrls(start.year, start.month, end.year, end.month);
}

export interface DeepProfile {
  username: string;
  totalItems: number;
  totalComments: number;
  totalStories: number;
  monthsCovered: number;
  monthlyActivity: { month: string; items: number; comments: number; stories: number }[];
  hourlyActivity: { hour: number; count: number }[];
  dailyActivity: { day: number; count: number }[];
  topWords: { word: string; freq: number }[];
  repliesTo: { user: string; count: number }[];
  repliedBy: { user: string; count: number }[];
  threadDepth: { direct: number; nested: number };
  avgCommentLength: number;
  bestStory: { title: string; score: number; id: number } | null;
  percentile: number;
}

export async function analyzeDeep(
  username: string,
  onProgress?: (msg: string) => void,
): Promise<DeepProfile> {
  const db = await getDB();
  const conn = await db.connect();
  const progress = onProgress || (() => {});

  // Query last 6 months for a balance of depth and speed
  const urls = recentMonthUrls(6);
  const parquetList = urls.join(",\n  ");
  const src = `read_parquet([${parquetList}])`;

  try {
    // 1. Basic stats
    progress("querying basic stats...");
    const statsResult = await conn.query(`
      SELECT
        count(*) as total,
        count(*) FILTER (WHERE type = 2) as comments,
        count(*) FILTER (WHERE type = 1) as stories,
        round(avg(len(coalesce(text, ''))) FILTER (WHERE type = 2), 0) as avg_comment_len
      FROM ${src}
      WHERE "by" = '${escapeSql(username)}'
    `);
    const stats = arrowToObjects(statsResult)[0] || { total: 0, comments: 0, stories: 0, avg_comment_len: 0 };

    if (Number(stats.total) === 0) {
      await conn.close();
      throw new Error(`No activity found for "${username}" in the last 6 months`);
    }

    // 2. Monthly activity
    progress("analyzing monthly activity...");
    const monthlyResult = await conn.query(`
      SELECT
        strftime(time, '%Y-%m') as month,
        count(*) as items,
        count(*) FILTER (WHERE type = 2) as comments,
        count(*) FILTER (WHERE type = 1) as stories
      FROM ${src}
      WHERE "by" = '${escapeSql(username)}'
      GROUP BY month
      ORDER BY month
    `);
    const monthlyActivity = arrowToObjects(monthlyResult).map((r) => ({
      month: String(r.month),
      items: Number(r.items),
      comments: Number(r.comments),
      stories: Number(r.stories),
    }));

    // 3. Hourly activity
    progress("mapping activity patterns...");
    const hourlyResult = await conn.query(`
      SELECT
        extract(hour FROM time) as hour,
        count(*) as count
      FROM ${src}
      WHERE "by" = '${escapeSql(username)}'
      GROUP BY hour
      ORDER BY hour
    `);
    const hourlyRaw = arrowToObjects(hourlyResult);
    const hourlyActivity = Array.from({ length: 24 }, (_, i) => {
      const found = hourlyRaw.find((r) => Number(r.hour) === i);
      return { hour: i, count: found ? Number(found.count) : 0 };
    });

    // 4. Daily activity
    const dailyResult = await conn.query(`
      SELECT
        extract(dow FROM time) as day,
        count(*) as count
      FROM ${src}
      WHERE "by" = '${escapeSql(username)}'
      GROUP BY day
      ORDER BY day
    `);
    const dailyRaw = arrowToObjects(dailyResult);
    const dailyActivity = Array.from({ length: 7 }, (_, i) => {
      const found = dailyRaw.find((r) => Number(r.day) === i);
      return { day: i, count: found ? Number(found.count) : 0 };
    });

    // 5. Word fingerprint
    progress("building word fingerprint...");
    const wordsResult = await conn.query(`
      WITH user_words AS (
        SELECT unnest(words) as word
        FROM ${src}
        WHERE "by" = '${escapeSql(username)}' AND words IS NOT NULL
      )
      SELECT word, count(*) as freq
      FROM user_words
      WHERE len(word) > 4
        AND word NOT IN (
          'about','their','there','these','those','would','could','should',
          'which','being','where','other','really','think','people','because',
          'thing','things','might','every','never','still','while','after',
          'before','through','between','under','again','further','since',
          'during','without','within','along','following','across','behind',
          'beyond','until','among','around','using','including','another'
        )
      GROUP BY word
      ORDER BY freq DESC
      LIMIT 30
    `);
    const topWords = arrowToObjects(wordsResult).map((r) => ({
      word: String(r.word),
      freq: Number(r.freq),
    }));

    // 6. Engagement network — who they reply to (use most recent month only for speed)
    progress("mapping engagement network...");
    const recentUrl = urls[urls.length - 1];
    const recentSrc = `read_parquet([${recentUrl}])`;

    const repliesToResult = await conn.query(`
      WITH user_comments AS (
        SELECT id, parent FROM ${recentSrc}
        WHERE "by" = '${escapeSql(username)}' AND type = 2
      ),
      all_items AS (
        SELECT id, "by" FROM ${recentSrc}
      )
      SELECT a."by" as user, count(*) as count
      FROM user_comments u
      JOIN all_items a ON u.parent = a.id
      WHERE a."by" != '${escapeSql(username)}' AND a."by" IS NOT NULL AND a."by" != ''
      GROUP BY a."by"
      ORDER BY count DESC
      LIMIT 10
    `);
    const repliesTo = arrowToObjects(repliesToResult).map((r) => ({
      user: String(r.user),
      count: Number(r.count),
    }));

    // 7. Who replies to them
    const repliedByResult = await conn.query(`
      WITH user_items AS (
        SELECT id FROM ${recentSrc}
        WHERE "by" = '${escapeSql(username)}'
      ),
      replies AS (
        SELECT "by" as replier FROM ${recentSrc}
        WHERE parent IN (SELECT id FROM user_items)
          AND "by" != '${escapeSql(username)}'
          AND "by" IS NOT NULL AND "by" != ''
      )
      SELECT replier as user, count(*) as count
      FROM replies
      GROUP BY replier
      ORDER BY count DESC
      LIMIT 10
    `);
    const repliedBy = arrowToObjects(repliedByResult).map((r) => ({
      user: String(r.user),
      count: Number(r.count),
    }));

    // 8. Thread depth
    progress("analyzing thread depth...");
    const depthResult = await conn.query(`
      WITH user_comments AS (
        SELECT id, parent FROM ${recentSrc}
        WHERE "by" = '${escapeSql(username)}' AND type = 2
      ),
      all_items AS (
        SELECT id, type FROM ${recentSrc}
      ),
      depth_check AS (
        SELECT CASE WHEN a.type = 1 THEN 'direct' ELSE 'nested' END as kind
        FROM user_comments u
        LEFT JOIN all_items a ON u.parent = a.id
      )
      SELECT kind, count(*) as cnt FROM depth_check GROUP BY kind
    `);
    const depthRaw = arrowToObjects(depthResult);
    const threadDepth = {
      direct: Number(depthRaw.find((r) => r.kind === "direct")?.cnt || 0),
      nested: Number(depthRaw.find((r) => r.kind === "nested")?.cnt || 0),
    };

    // 9. Best story
    progress("finding top content...");
    const bestResult = await conn.query(`
      SELECT title, score, id
      FROM ${src}
      WHERE "by" = '${escapeSql(username)}' AND type = 1 AND score IS NOT NULL
      ORDER BY score DESC
      LIMIT 1
    `);
    const bestRows = arrowToObjects(bestResult);
    const bestStory = bestRows.length > 0
      ? { title: String(bestRows[0].title), score: Number(bestRows[0].score), id: Number(bestRows[0].id) }
      : null;

    // 10. Percentile ranking (most recent month)
    progress("computing percentile rank...");
    const percentileResult = await conn.query(`
      WITH monthly_users AS (
        SELECT "by", count(*) as items
        FROM ${recentSrc}
        WHERE "by" IS NOT NULL AND deleted = 0
        GROUP BY "by"
      )
      SELECT round(percent_rank() OVER (ORDER BY items) * 100, 1) as percentile
      FROM monthly_users
      WHERE "by" = '${escapeSql(username)}'
    `);
    const pctRows = arrowToObjects(percentileResult);
    const percentile = pctRows.length > 0 ? Number(pctRows[0].percentile) : 0;

    await conn.close();

    return {
      username,
      totalItems: Number(stats.total),
      totalComments: Number(stats.comments),
      totalStories: Number(stats.stories),
      monthsCovered: monthlyActivity.length,
      monthlyActivity,
      hourlyActivity,
      dailyActivity,
      topWords,
      repliesTo,
      repliedBy,
      threadDepth,
      avgCommentLength: Number(stats.avg_comment_len),
      bestStory,
      percentile,
    };
  } catch (e) {
    await conn.close();
    throw e;
  }
}

function escapeSql(s: string): string {
  return s.replace(/'/g, "''");
}

// Convert Arrow table to plain objects
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function arrowToObjects(table: any): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < table.numRows; i++) {
    const row: Record<string, unknown> = {};
    for (const field of table.schema.fields) {
      const col = table.getChild(field.name);
      row[field.name] = col?.get(i);
    }
    rows.push(row);
  }
  return rows;
}
