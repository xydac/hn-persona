import * as duckdb from "@duckdb/duckdb-wasm";

let db: duckdb.AsyncDuckDB | null = null;
let initPromise: Promise<duckdb.AsyncDuckDB> | null = null;

const HF_BASE = "https://huggingface.co/datasets/open-index/hacker-news/resolve/main/data";
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

function recentMonthUrls(months: number): string[] {
  const now = new Date();
  const end = { year: now.getFullYear(), month: now.getMonth() + 1 };
  const startDate = new Date(now);
  startDate.setMonth(startDate.getMonth() - months + 1);
  const start = { year: startDate.getFullYear(), month: startDate.getMonth() + 1 };
  return getParquetUrls(start.year, start.month, end.year, end.month);
}

function escapeSql(s: string): string {
  return s.replace(/'/g, "''");
}

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

// --- Individual query result types ---

export interface StatsResult {
  totalItems: number;
  totalComments: number;
  totalStories: number;
  avgCommentLength: number;
}

export interface MonthlyResult {
  monthlyActivity: { month: string; items: number; comments: number; stories: number }[];
}

export interface ActivityResult {
  hourlyActivity: { hour: number; count: number }[];
  dailyActivity: { day: number; count: number }[];
}

export interface WordsResult {
  topWords: { word: string; freq: number }[];
}

export interface NetworkResult {
  repliesTo: { user: string; count: number }[];
  repliedBy: { user: string; count: number }[];
}

export interface DepthResult {
  threadDepth: { direct: number; nested: number };
}

export interface BestStoryResult {
  bestStory: { title: string; score: number; id: number } | null;
}

export interface PercentileResult {
  percentile: number;
}

// --- Individual query functions (each gets its own connection) ---

async function runQuery(sql: string): Promise<Record<string, unknown>[]> {
  const database = await getDB();
  const conn = await database.connect();
  try {
    const result = await conn.query(sql);
    return arrowToObjects(result);
  } finally {
    await conn.close();
  }
}

export async function queryStats(username: string, src: string): Promise<StatsResult> {
  const rows = await runQuery(`
    SELECT count(*) as total,
      count(*) FILTER (WHERE type = 2) as comments,
      count(*) FILTER (WHERE type = 1) as stories,
      round(avg(len(coalesce(text, ''))) FILTER (WHERE type = 2), 0) as avg_comment_len
    FROM ${src} WHERE "by" = '${escapeSql(username)}'
  `);
  const r = rows[0] || { total: 0, comments: 0, stories: 0, avg_comment_len: 0 };
  return {
    totalItems: Number(r.total),
    totalComments: Number(r.comments),
    totalStories: Number(r.stories),
    avgCommentLength: Number(r.avg_comment_len),
  };
}

export async function queryMonthly(username: string, src: string): Promise<MonthlyResult> {
  const rows = await runQuery(`
    SELECT strftime(time, '%Y-%m') as month, count(*) as items,
      count(*) FILTER (WHERE type = 2) as comments,
      count(*) FILTER (WHERE type = 1) as stories
    FROM ${src} WHERE "by" = '${escapeSql(username)}'
    GROUP BY month ORDER BY month
  `);
  return {
    monthlyActivity: rows.map((r) => ({
      month: String(r.month), items: Number(r.items),
      comments: Number(r.comments), stories: Number(r.stories),
    })),
  };
}

export async function queryActivity(username: string, src: string): Promise<ActivityResult> {
  const hourlyRows = await runQuery(`
    SELECT extract(hour FROM time) as hour, count(*) as count
    FROM ${src} WHERE "by" = '${escapeSql(username)}'
    GROUP BY hour ORDER BY hour
  `);
  const dailyRows = await runQuery(`
    SELECT extract(dow FROM time) as day, count(*) as count
    FROM ${src} WHERE "by" = '${escapeSql(username)}'
    GROUP BY day ORDER BY day
  `);
  return {
    hourlyActivity: Array.from({ length: 24 }, (_, i) => {
      const found = hourlyRows.find((r) => Number(r.hour) === i);
      return { hour: i, count: found ? Number(found.count) : 0 };
    }),
    dailyActivity: Array.from({ length: 7 }, (_, i) => {
      const found = dailyRows.find((r) => Number(r.day) === i);
      return { day: i, count: found ? Number(found.count) : 0 };
    }),
  };
}

export async function queryWords(username: string, src: string): Promise<WordsResult> {
  const rows = await runQuery(`
    WITH user_words AS (
      SELECT unnest(words) as word
      FROM ${src} WHERE "by" = '${escapeSql(username)}' AND words IS NOT NULL
    )
    SELECT word, count(*) as freq FROM user_words
    WHERE len(word) > 4
      AND word NOT IN (
        'about','their','there','these','those','would','could','should',
        'which','being','where','other','really','think','people','because',
        'thing','things','might','every','never','still','while','after',
        'before','through','between','under','again','further','since',
        'during','without','within','along','following','across','behind',
        'beyond','until','among','around','using','including','another'
      )
    GROUP BY word ORDER BY freq DESC LIMIT 30
  `);
  return {
    topWords: rows.map((r) => ({ word: String(r.word), freq: Number(r.freq) })),
  };
}

export async function queryNetwork(username: string, recentSrc: string): Promise<NetworkResult> {
  const esc = escapeSql(username);
  const [repliesToRows, repliedByRows] = await Promise.all([
    runQuery(`
      WITH user_comments AS (
        SELECT id, parent FROM ${recentSrc}
        WHERE "by" = '${esc}' AND type = 2
      ),
      all_items AS (
        SELECT id, "by" FROM ${recentSrc}
      )
      SELECT a."by" as "user", count(*) as count
      FROM user_comments u
      JOIN all_items a ON u.parent = a.id
      WHERE a."by" != '${esc}' AND a."by" IS NOT NULL AND a."by" != ''
      GROUP BY a."by" ORDER BY count DESC LIMIT 10
    `),
    runQuery(`
      WITH user_items AS (
        SELECT id FROM ${recentSrc} WHERE "by" = '${esc}'
      ),
      replies AS (
        SELECT "by" as replier FROM ${recentSrc}
        WHERE parent IN (SELECT id FROM user_items)
          AND "by" != '${esc}' AND "by" IS NOT NULL AND "by" != ''
      )
      SELECT replier as "user", count(*) as count
      FROM replies GROUP BY replier ORDER BY count DESC LIMIT 10
    `),
  ]);
  return {
    repliesTo: repliesToRows.map((r) => ({ user: String(r.user), count: Number(r.count) })),
    repliedBy: repliedByRows.map((r) => ({ user: String(r.user), count: Number(r.count) })),
  };
}

export async function queryDepth(username: string, recentSrc: string): Promise<DepthResult> {
  const rows = await runQuery(`
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
  return {
    threadDepth: {
      direct: Number(rows.find((r) => r.kind === "direct")?.cnt || 0),
      nested: Number(rows.find((r) => r.kind === "nested")?.cnt || 0),
    },
  };
}

export async function queryBestStory(username: string, src: string): Promise<BestStoryResult> {
  const rows = await runQuery(`
    SELECT title, score, id FROM ${src}
    WHERE "by" = '${escapeSql(username)}' AND type = 1 AND score IS NOT NULL
    ORDER BY score DESC LIMIT 1
  `);
  return {
    bestStory: rows.length > 0
      ? { title: String(rows[0].title), score: Number(rows[0].score), id: Number(rows[0].id) }
      : null,
  };
}

export async function queryPercentile(username: string, recentSrc: string): Promise<PercentileResult> {
  const rows = await runQuery(`
    WITH monthly_users AS (
      SELECT "by", count(*) as items
      FROM ${recentSrc}
      WHERE "by" IS NOT NULL AND deleted = 0
      GROUP BY "by"
    ),
    ranked AS (
      SELECT "by", round(percent_rank() OVER (ORDER BY items) * 100, 1) as percentile
      FROM monthly_users
    )
    SELECT percentile FROM ranked WHERE "by" = '${escapeSql(username)}'
  `);
  return { percentile: rows.length > 0 ? Number(rows[0].percentile) : 0 };
}

// --- Build source strings for the page to use ---

export function getSourceStrings(months = 6) {
  const urls = recentMonthUrls(months);
  const src = `read_parquet([${urls.join(",")}])`;
  const recentSrc = `read_parquet([${urls[urls.length - 1]}])`;
  return { src, recentSrc, monthCount: urls.length };
}
