"use client";

import { useEffect, useState, useCallback, use } from "react";
import type {
  StatsResult, MonthlyResult, ActivityResult, WordsResult,
  NetworkResult, DepthResult, BestStoryResult, PercentileResult,
} from "@/lib/duckdb";
import Link from "next/link";

// --- Reusable chart components ---

function BarChartH({ data, colorClass = "bg-accent" }: { data: { name: string; value: number }[]; colorClass?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-1">
      {data.map((d) => (
        <div key={d.name} className="flex items-center gap-2 text-xs">
          <span className="w-20 text-right text-muted truncate shrink-0">{d.name}</span>
          <div className="flex-1 h-4 bg-surface-2 rounded-sm overflow-hidden">
            <div className={`h-full ${colorClass} rounded-sm transition-all duration-500`}
              style={{ width: `${(d.value / max) * 100}%` }} />
          </div>
          <span className="w-10 text-right text-muted shrink-0">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

function WordCloud({ words }: { words: { word: string; freq: number }[] }) {
  const max = Math.max(...words.map((w) => w.freq), 1);
  return (
    <div className="flex flex-wrap gap-2">
      {words.map((w) => {
        const intensity = w.freq / max;
        const size = 11 + intensity * 8;
        return (
          <span key={w.word} className="transition-all duration-200 hover:text-accent cursor-default"
            style={{
              fontSize: `${size}px`,
              opacity: 0.4 + intensity * 0.6,
              color: intensity > 0.6 ? "var(--accent)" : intensity > 0.3 ? "var(--foreground)" : "var(--muted)",
            }}
            title={`${w.word}: ${w.freq}`}
          >{w.word}</span>
        );
      })}
    </div>
  );
}

function CardSkeleton({ title, height = "h-32" }: { title: string; height?: string }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-5 animate-pulse">
      <div className="text-sm font-bold text-muted mb-4">{title}</div>
      <div className={`${height} bg-surface-2 rounded`} />
    </div>
  );
}

function CardError({ title, error }: { title: string; error: string }) {
  return (
    <div className="bg-surface border border-red-900/30 rounded-lg p-5">
      <div className="text-sm font-bold text-red-400 mb-2">{title}</div>
      <div className="text-xs text-red-400/70">{error}</div>
    </div>
  );
}

// --- Individual card components ---

function StatsCards({ data }: { data: StatsResult }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 fade-in">
      {[
        { label: "total items", value: data.totalItems.toLocaleString() },
        { label: "comments", value: data.totalComments.toLocaleString() },
        { label: "stories", value: data.totalStories.toLocaleString() },
        { label: "avg comment", value: `${data.avgCommentLength} chars` },
      ].map((s) => (
        <div key={s.label} className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs text-muted">{s.label}</div>
          <div className="text-xl font-bold">{s.value}</div>
        </div>
      ))}
    </div>
  );
}

function PercentileCard({ data }: { data: PercentileResult }) {
  return (
    <div className="bg-surface border border-accent/20 rounded-lg p-4 fade-in">
      <div className="text-xs text-muted">percentile</div>
      <div className="text-xl font-bold text-accent">{data.percentile}%</div>
      <div className="text-[10px] text-muted">vs all users this month</div>
    </div>
  );
}

function MonthlyCard({ data }: { data: MonthlyResult }) {
  const max = Math.max(...data.monthlyActivity.map((x) => x.items), 1);
  return (
    <div className="bg-surface border border-border rounded-lg p-5 fade-in">
      <h2 className="text-sm font-bold text-accent mb-4">Monthly Activity</h2>
      <div className="flex items-end gap-[3px] h-32">
        {data.monthlyActivity.map((m) => (
          <div key={m.month} className="flex-1 flex flex-col items-center" title={`${m.month}: ${m.items} items`}>
            <div className="w-full flex flex-col-reverse gap-[1px]" style={{ height: `${(m.items / max) * 100}%` }}>
              <div className="w-full bg-accent/70 rounded-t-sm min-h-[1px]"
                style={{ height: `${m.items > 0 ? (m.comments / m.items) * 100 : 0}%` }} />
              {m.stories > 0 && (
                <div className="w-full bg-hn-orange/70 rounded-t-sm"
                  style={{ height: `${(m.stories / m.items) * 100}%` }} />
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-muted">
        <span>{data.monthlyActivity[0]?.month}</span>
        <div className="flex gap-3">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-accent/70 rounded-sm" /> comments</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-hn-orange/70 rounded-sm" /> stories</span>
        </div>
        <span>{data.monthlyActivity[data.monthlyActivity.length - 1]?.month}</span>
      </div>
    </div>
  );
}

function ActivityCard({ data }: { data: ActivityResult }) {
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hourMax = Math.max(...data.hourlyActivity.map((x) => x.count), 1);
  return (
    <div className="bg-surface border border-border rounded-lg p-5 fade-in">
      <h2 className="text-sm font-bold text-accent mb-4">Activity by Hour (UTC)</h2>
      <div className="flex items-end gap-[2px] h-20 mb-6">
        {data.hourlyActivity.map((h) => (
          <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-accent/70 rounded-t-sm hover:bg-accent transition-colors min-h-[1px]"
              style={{ height: `${(h.count / hourMax) * 100}%` }}
              title={`${h.hour}:00 — ${h.count} items`} />
            {h.hour % 6 === 0 && <span className="text-[9px] text-muted">{h.hour}</span>}
          </div>
        ))}
      </div>
      <h2 className="text-sm font-bold text-accent mb-3">Activity by Day</h2>
      <BarChartH data={data.dailyActivity.map((d) => ({ name: dayLabels[d.day], value: d.count }))} />
    </div>
  );
}

function WordsCard({ data }: { data: WordsResult }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-5 fade-in">
      <h2 className="text-sm font-bold text-accent mb-4 flex items-center gap-2">
        <span className="text-hn-orange">#</span> Word Fingerprint
      </h2>
      {data.topWords.length > 0 ? <WordCloud words={data.topWords} /> : <p className="text-xs text-muted">Not enough data</p>}
    </div>
  );
}

function NetworkCard({ data }: { data: NetworkResult }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 fade-in">
      <div className="bg-surface border border-border rounded-lg p-5">
        <h2 className="text-sm font-bold text-accent mb-4">
          <span className="text-hn-orange">&rarr;</span> Replies To
        </h2>
        {data.repliesTo.length > 0
          ? <BarChartH data={data.repliesTo.map((r) => ({ name: r.user, value: r.count }))} colorClass="bg-accent/60" />
          : <p className="text-xs text-muted">No reply data</p>}
      </div>
      <div className="bg-surface border border-border rounded-lg p-5">
        <h2 className="text-sm font-bold text-accent mb-4">
          <span className="text-hn-orange">&larr;</span> Replied By
        </h2>
        {data.repliedBy.length > 0
          ? <BarChartH data={data.repliedBy.map((r) => ({ name: r.user, value: r.count }))} colorClass="bg-hn-orange/60" />
          : <p className="text-xs text-muted">No reply data</p>}
      </div>
    </div>
  );
}

function DepthCard({ data }: { data: DepthResult }) {
  const total = data.threadDepth.direct + data.threadDepth.nested;
  const nestedPct = total > 0 ? Math.round((data.threadDepth.nested / total) * 100) : 0;
  return (
    <div className="bg-surface border border-border rounded-lg p-5 fade-in">
      <h2 className="text-sm font-bold text-accent mb-4">Thread Behavior</h2>
      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>Direct replies</span><span className="text-muted">{data.threadDepth.direct}</span>
          </div>
          <div className="h-3 bg-surface-2 rounded-full overflow-hidden">
            <div className="h-full bg-accent/50 rounded-full" style={{ width: `${100 - nestedPct}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span>Nested (deep threads)</span><span className="text-muted">{data.threadDepth.nested}</span>
          </div>
          <div className="h-3 bg-surface-2 rounded-full overflow-hidden">
            <div className="h-full bg-hn-orange/50 rounded-full" style={{ width: `${nestedPct}%` }} />
          </div>
        </div>
        <p className="text-xs text-muted">
          {nestedPct > 80 ? "Deep thread diver — loves extended discussions"
            : nestedPct > 50 ? "Balanced mix of top-level and nested replies"
              : "Primarily responds to stories directly"}
        </p>
      </div>
    </div>
  );
}

function BestStoryCard({ data }: { data: BestStoryResult }) {
  if (!data.bestStory) return null;
  return (
    <div className="bg-surface border border-border rounded-lg p-5 fade-in">
      <h2 className="text-sm font-bold text-accent mb-4">Best Story</h2>
      <a href={`https://news.ycombinator.com/item?id=${data.bestStory.id}`}
        target="_blank" rel="noopener noreferrer"
        className="text-foreground hover:text-accent transition-colors text-sm">
        {data.bestStory.title}
      </a>
      <div className="text-xs text-hn-orange mt-2">{data.bestStory.score} points</div>
    </div>
  );
}

// --- Card state ---

type CardState<T> = { status: "loading" } | { status: "done"; data: T } | { status: "error"; error: string };

// Yield to browser so React can paint between state updates
const yieldToBrowser = () => new Promise<void>((r) => setTimeout(r, 0));

// --- Main page ---

export default function DeepPage({ params }: { params: Promise<{ username: string }> }) {
  const { username: rawUsername } = use(params);
  const username = decodeURIComponent(rawUsername);

  const [initState, setInitState] = useState<"loading" | "ready" | "error">("loading");
  const [initError, setInitError] = useState("");
  const [sources, setSources] = useState<{ src: string; recentSrc: string } | null>(null);

  const [stats, setStats] = useState<CardState<StatsResult>>({ status: "loading" });
  const [percentile, setPercentile] = useState<CardState<PercentileResult>>({ status: "loading" });
  const [monthly, setMonthly] = useState<CardState<MonthlyResult>>({ status: "loading" });
  const [activity, setActivity] = useState<CardState<ActivityResult>>({ status: "loading" });
  const [words, setWords] = useState<CardState<WordsResult>>({ status: "loading" });
  const [network, setNetwork] = useState<CardState<NetworkResult>>({ status: "loading" });
  const [depth, setDepth] = useState<CardState<DepthResult>>({ status: "loading" });
  const [bestStory, setBestStory] = useState<CardState<BestStoryResult>>({ status: "loading" });

  // Sequential query pipeline — each card appears as its query finishes
  const runPipeline = useCallback(async (user: string, src: string, recentSrc: string) => {
    const mod = await import("@/lib/duckdb");

    // Helper: run a query, update state, yield to browser for re-render
    async function run<T>(
      fn: () => Promise<T>,
      setter: (s: CardState<T>) => void,
    ) {
      try {
        const data = await fn();
        setter({ status: "done", data });
      } catch (e) {
        setter({ status: "error", error: e instanceof Error ? e.message : "Query failed" });
      }
      await yieldToBrowser();
    }

    // Run queries one by one — each card pops in after its query
    await run(() => mod.queryStats(user, src), setStats);
    await run(() => mod.queryMonthly(user, src), setMonthly);
    await run(() => mod.queryActivity(user, src), setActivity);
    await run(() => mod.queryPercentile(user, recentSrc), setPercentile);
    await run(() => mod.queryWords(user, src), setWords);
    await run(() => mod.queryNetwork(user, recentSrc), setNetwork);
    await run(() => mod.queryDepth(user, recentSrc), setDepth);
    await run(() => mod.queryBestStory(user, src), setBestStory);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mod = await import("@/lib/duckdb");
        await mod.getDB();
        if (cancelled) return;
        const srcs = mod.getSourceStrings(6);
        setSources({ src: srcs.src, recentSrc: srcs.recentSrc });
        setInitState("ready");

        // Start query pipeline
        await runPipeline(username, srcs.src, srcs.recentSrc);
      } catch (e) {
        if (!cancelled) {
          setInitError(e instanceof Error ? e.message : "Failed to initialize");
          setInitState("error");
        }
      }
    })();
    return () => { cancelled = true; };
  }, [username, runPipeline]);

  if (initState === "error") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-lg bg-surface border border-red-900/50 rounded-lg p-6">
          <div className="text-sm text-red-400 mb-4">Failed to initialize DuckDB WASM</div>
          <div className="text-xs text-red-400/70 mb-4">{initError}</div>
          <Link href={`/user/${rawUsername}`} className="text-xs text-accent hover:text-accent/80">
            &larr; try quick profile instead
          </Link>
        </div>
      </main>
    );
  }

  if (initState === "loading" || !sources) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-lg bg-surface border border-border rounded-lg p-6">
          <div className="flex items-center gap-2 text-xs text-muted mb-4">
            <span className="text-hn-orange">~</span>
            <span>hn.persona</span>
            <span className="text-border">|</span>
            <span className="text-hn-orange">deep analysis</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-hn-orange">
            <span>[..]</span>
            <span>initializing DuckDB WASM engine...</span>
            <span className="w-2 h-3 bg-hn-orange cursor-blink" />
          </div>
          <div className="mt-3 text-[10px] text-border">Loading ~5MB WASM binary from CDN</div>
        </div>
      </main>
    );
  }

  const completedCount = [stats, percentile, monthly, activity, words, network, depth, bestStory]
    .filter((s) => s.status !== "loading").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-6 h-6 bg-hn-orange rounded-sm flex items-center justify-center text-background font-bold text-xs">Y</div>
            <span className="text-sm font-bold">
              <span className="text-hn-orange">hn</span><span className="text-muted">.</span><span className="text-accent">persona</span>
            </span>
          </Link>
          <div className="flex items-center gap-3 text-xs">
            <span className="bg-hn-orange/10 text-hn-orange px-2 py-0.5 rounded border border-hn-orange/20">DuckDB WASM</span>
            <span className="text-muted">{completedCount}/8 queries &middot; 6 months</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* User header */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold">{username}</h1>
              <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded border border-accent/20">deep analysis</span>
            </div>
            <div className="text-xs text-muted">
              {completedCount < 8 ? "Loading cards sequentially..." : "All queries complete"}
            </div>
          </div>
          <Link href={`/user/${rawUsername}`} className="text-xs text-muted hover:text-accent transition-colors">
            &larr; quick profile
          </Link>
        </div>

        {/* Stats + Percentile row */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-3">
          {stats.status === "loading" ? <CardSkeleton title="Stats" height="h-16" />
            : stats.status === "error" ? <CardError title="Stats" error={stats.error} />
              : <StatsCards data={stats.data} />}
          {percentile.status === "loading" ? <CardSkeleton title="Percentile" height="h-16" />
            : percentile.status === "error" ? <CardError title="Percentile" error={percentile.error} />
              : <PercentileCard data={percentile.data} />}
        </div>

        {/* Monthly timeline */}
        {monthly.status === "loading" ? <CardSkeleton title="Monthly Activity" />
          : monthly.status === "error" ? <CardError title="Monthly Activity" error={monthly.error} />
            : <MonthlyCard data={monthly.data} />}

        {/* Words + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {words.status === "loading" ? <CardSkeleton title="Word Fingerprint" />
            : words.status === "error" ? <CardError title="Word Fingerprint" error={words.error} />
              : <WordsCard data={words.data} />}
          {activity.status === "loading" ? <CardSkeleton title="Activity Patterns" />
            : activity.status === "error" ? <CardError title="Activity Patterns" error={activity.error} />
              : <ActivityCard data={activity.data} />}
        </div>

        {/* Network */}
        {network.status === "loading" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CardSkeleton title="Replies To" />
            <CardSkeleton title="Replied By" />
          </div>
        ) : network.status === "error" ? <CardError title="Engagement Network" error={network.error} />
          : <NetworkCard data={network.data} />}

        {/* Depth + Best Story */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {depth.status === "loading" ? <CardSkeleton title="Thread Behavior" />
            : depth.status === "error" ? <CardError title="Thread Behavior" error={depth.error} />
              : <DepthCard data={depth.data} />}
          {bestStory.status === "loading" ? <CardSkeleton title="Best Story" />
            : bestStory.status === "error" ? <CardError title="Best Story" error={bestStory.error} />
              : <BestStoryCard data={bestStory.data} />}
        </div>

        {/* Footer */}
        <footer className="text-center py-8 text-xs text-border">
          <p>DuckDB WASM &middot; HuggingFace parquet &middot; all queries run in your browser</p>
          <p className="mt-1">
            <Link href="/" className="text-muted hover:text-accent transition-colors">analyze another user</Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
