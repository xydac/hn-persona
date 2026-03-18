"use client";

import { useEffect, useState, useCallback, use } from "react";
import type { DeepProfile } from "@/lib/duckdb";
import Link from "next/link";

const PROGRESS_STEPS = [
  "initializing DuckDB WASM...",
  "loading parquet files from HuggingFace...",
  "querying basic stats...",
  "analyzing monthly activity...",
  "mapping activity patterns...",
  "building word fingerprint...",
  "mapping engagement network...",
  "analyzing thread depth...",
  "finding top content...",
  "computing percentile rank...",
  "done.",
];

function BarChartH({ data, label, colorClass = "bg-accent" }: { data: { name: string; value: number }[]; label?: string; colorClass?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-1">
      {label && <div className="text-xs text-muted mb-2">{label}</div>}
      {data.map((d) => (
        <div key={d.name} className="flex items-center gap-2 text-xs">
          <span className="w-20 text-right text-muted truncate shrink-0">{d.name}</span>
          <div className="flex-1 h-4 bg-surface-2 rounded-sm overflow-hidden">
            <div
              className={`h-full ${colorClass} rounded-sm transition-all duration-500`}
              style={{ width: `${(d.value / max) * 100}%` }}
            />
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
          <span
            key={w.word}
            className="transition-all duration-200 hover:text-accent cursor-default"
            style={{
              fontSize: `${size}px`,
              opacity: 0.4 + intensity * 0.6,
              color: intensity > 0.6 ? "var(--accent)" : intensity > 0.3 ? "var(--foreground)" : "var(--muted)",
            }}
            title={`${w.word}: ${w.freq}`}
          >
            {w.word}
          </span>
        );
      })}
    </div>
  );
}

function DeepView({ profile }: { profile: DeepProfile }) {
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const depthTotal = profile.threadDepth.direct + profile.threadDepth.nested;
  const nestedPct = depthTotal > 0 ? Math.round((profile.threadDepth.nested / depthTotal) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-6 h-6 bg-hn-orange rounded-sm flex items-center justify-center text-background font-bold text-xs">
              Y
            </div>
            <span className="text-sm font-bold">
              <span className="text-hn-orange">hn</span>
              <span className="text-muted">.</span>
              <span className="text-accent">persona</span>
            </span>
          </Link>
          <div className="flex items-center gap-3 text-xs">
            <span className="bg-hn-orange/10 text-hn-orange px-2 py-0.5 rounded border border-hn-orange/20">
              DuckDB WASM
            </span>
            <span className="text-muted">
              {profile.totalItems.toLocaleString()} items &middot; {profile.monthsCovered} months
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <section className="fade-in">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-foreground">{profile.username}</h1>
                <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded border border-accent/20">
                  deep analysis
                </span>
              </div>
              <div className="text-xs text-muted">
                Powered by DuckDB WASM querying HuggingFace parquet files in your browser
              </div>
            </div>
            <Link
              href={`/user/${profile.username}`}
              className="text-xs text-muted hover:text-accent transition-colors"
            >
              &larr; quick profile
            </Link>
          </div>
        </section>

        {/* Stats */}
        <section className="fade-in fade-in-delay-1 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="text-xs text-muted">total items</div>
            <div className="text-xl font-bold">{profile.totalItems.toLocaleString()}</div>
          </div>
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="text-xs text-muted">comments</div>
            <div className="text-xl font-bold">{profile.totalComments.toLocaleString()}</div>
          </div>
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="text-xs text-muted">stories</div>
            <div className="text-xl font-bold">{profile.totalStories.toLocaleString()}</div>
          </div>
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="text-xs text-muted">avg comment</div>
            <div className="text-xl font-bold">{profile.avgCommentLength}</div>
            <div className="text-[10px] text-muted">chars</div>
          </div>
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="text-xs text-muted">percentile</div>
            <div className="text-xl font-bold text-accent">{profile.percentile}%</div>
            <div className="text-[10px] text-muted">vs all users</div>
          </div>
          <div className="bg-surface border border-border rounded-lg p-4">
            <div className="text-xs text-muted">thread depth</div>
            <div className="text-xl font-bold">{nestedPct}%</div>
            <div className="text-[10px] text-muted">nested replies</div>
          </div>
        </section>

        {/* Monthly Timeline */}
        <section className="fade-in fade-in-delay-2 bg-surface border border-border rounded-lg p-5">
          <h2 className="text-sm font-bold text-accent mb-4">Monthly Activity</h2>
          <div className="flex items-end gap-[3px] h-32">
            {profile.monthlyActivity.map((m) => {
              const max = Math.max(...profile.monthlyActivity.map((x) => x.items), 1);
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1" title={`${m.month}: ${m.items} items`}>
                  <div className="w-full flex flex-col-reverse gap-[1px]" style={{ height: `${(m.items / max) * 100}%` }}>
                    <div
                      className="w-full bg-accent/70 rounded-t-sm min-h-[1px]"
                      style={{ height: `${m.items > 0 ? (m.comments / m.items) * 100 : 0}%` }}
                    />
                    {m.stories > 0 && (
                      <div
                        className="w-full bg-hn-orange/70 rounded-t-sm"
                        style={{ height: `${(m.stories / m.items) * 100}%` }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-muted">
            <span>{profile.monthlyActivity[0]?.month}</span>
            <div className="flex gap-3">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-accent/70 rounded-sm" /> comments</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-hn-orange/70 rounded-sm" /> stories</span>
            </div>
            <span>{profile.monthlyActivity[profile.monthlyActivity.length - 1]?.month}</span>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Word Cloud */}
          <section className="fade-in fade-in-delay-3 bg-surface border border-border rounded-lg p-5">
            <h2 className="text-sm font-bold text-accent mb-4 flex items-center gap-2">
              <span className="text-hn-orange">#</span> Word Fingerprint
            </h2>
            {profile.topWords.length > 0 ? (
              <WordCloud words={profile.topWords} />
            ) : (
              <p className="text-xs text-muted">Not enough data</p>
            )}
          </section>

          {/* Activity Patterns */}
          <section className="fade-in fade-in-delay-3 bg-surface border border-border rounded-lg p-5">
            <h2 className="text-sm font-bold text-accent mb-4">Activity by Hour (UTC)</h2>
            <div className="flex items-end gap-[2px] h-20 mb-6">
              {profile.hourlyActivity.map((h) => {
                const max = Math.max(...profile.hourlyActivity.map((x) => x.count), 1);
                return (
                  <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-accent/70 rounded-t-sm hover:bg-accent transition-colors min-h-[1px]"
                      style={{ height: `${(h.count / max) * 100}%` }}
                      title={`${h.hour}:00 — ${h.count} items`}
                    />
                    {h.hour % 6 === 0 && <span className="text-[9px] text-muted">{h.hour}</span>}
                  </div>
                );
              })}
            </div>
            <h2 className="text-sm font-bold text-accent mb-3">Activity by Day</h2>
            <BarChartH
              data={profile.dailyActivity.map((d) => ({ name: dayLabels[d.day], value: d.count }))}
            />
          </section>
        </div>

        {/* Engagement Network */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="fade-in fade-in-delay-4 bg-surface border border-border rounded-lg p-5">
            <h2 className="text-sm font-bold text-accent mb-4 flex items-center gap-2">
              <span className="text-hn-orange">&rarr;</span> Replies To (most recent month)
            </h2>
            {profile.repliesTo.length > 0 ? (
              <BarChartH
                data={profile.repliesTo.map((r) => ({ name: r.user, value: r.count }))}
                colorClass="bg-accent/60"
              />
            ) : (
              <p className="text-xs text-muted">No reply data available</p>
            )}
          </section>

          <section className="fade-in fade-in-delay-4 bg-surface border border-border rounded-lg p-5">
            <h2 className="text-sm font-bold text-accent mb-4 flex items-center gap-2">
              <span className="text-hn-orange">&larr;</span> Replied By (most recent month)
            </h2>
            {profile.repliedBy.length > 0 ? (
              <BarChartH
                data={profile.repliedBy.map((r) => ({ name: r.user, value: r.count }))}
                colorClass="bg-hn-orange/60"
              />
            ) : (
              <p className="text-xs text-muted">No reply data available</p>
            )}
          </section>
        </div>

        {/* Thread Depth + Best Story */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="fade-in fade-in-delay-5 bg-surface border border-border rounded-lg p-5">
            <h2 className="text-sm font-bold text-accent mb-4">Thread Behavior</h2>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Direct replies to stories</span>
                  <span className="text-muted">{profile.threadDepth.direct}</span>
                </div>
                <div className="h-3 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent/50 rounded-full"
                    style={{ width: `${depthTotal > 0 ? (profile.threadDepth.direct / depthTotal) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Nested replies (deep threads)</span>
                  <span className="text-muted">{profile.threadDepth.nested}</span>
                </div>
                <div className="h-3 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-hn-orange/50 rounded-full"
                    style={{ width: `${nestedPct}%` }}
                  />
                </div>
              </div>
              <p className="text-xs text-muted mt-2">
                {nestedPct > 80
                  ? "Deep thread diver — loves getting into extended discussions"
                  : nestedPct > 50
                    ? "Balanced mix of top-level and nested replies"
                    : "Primarily responds to stories directly"}
              </p>
            </div>
          </section>

          {profile.bestStory && (
            <section className="fade-in fade-in-delay-5 bg-surface border border-border rounded-lg p-5">
              <h2 className="text-sm font-bold text-accent mb-4">Best Story (last 6 months)</h2>
              <a
                href={`https://news.ycombinator.com/item?id=${profile.bestStory.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:text-accent transition-colors text-sm"
              >
                {profile.bestStory.title}
              </a>
              <div className="text-xs text-hn-orange mt-2">{profile.bestStory.score} points</div>
            </section>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center py-8 text-xs text-border space-y-2">
          <p>
            queried {profile.monthsCovered} months of HuggingFace parquet data via DuckDB WASM
            &middot; {profile.totalItems.toLocaleString()} items analyzed in-browser
          </p>
          <p>
            <Link href="/" className="text-muted hover:text-accent transition-colors">
              analyze another user
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}

export default function DeepPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const [profile, setProfile] = useState<DeepProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<string[]>(["initializing DuckDB WASM..."]);

  const addProgress = useCallback((msg: string) => {
    setProgress((prev) => {
      if (prev[prev.length - 1] === msg) return prev;
      return [...prev, msg];
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        addProgress("loading DuckDB WASM engine...");
        const { analyzeDeep } = await import("@/lib/duckdb");
        if (cancelled) return;

        addProgress("connecting to HuggingFace dataset...");
        const result = await analyzeDeep(decodeURIComponent(username), (msg) => {
          if (!cancelled) addProgress(msg);
        });

        if (!cancelled) {
          addProgress("done.");
          setProfile(result);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Analysis failed");
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [username, addProgress]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-lg space-y-6">
          <div className="bg-surface border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 text-xs text-muted mb-4">
              <span className="text-hn-orange">~</span>
              <span>hn.persona</span>
              <span className="text-border">|</span>
              <span className="text-hn-orange">deep analysis</span>
              <span className="text-border">|</span>
              <span className="text-foreground">{decodeURIComponent(username)}</span>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              {progress.map((msg, i) => {
                const isLatest = i === progress.length - 1;
                const isDone = PROGRESS_STEPS.indexOf(msg) < progress.length - 1;
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-2 ${isLatest ? "text-hn-orange" : "text-muted"}`}
                  >
                    <span>{isDone && !isLatest ? "[ok]" : "[..]"}</span>
                    <span>{msg}</span>
                    {isLatest && <span className="w-2 h-3 bg-hn-orange cursor-blink" />}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 text-[10px] text-border">
              DuckDB WASM is querying remote parquet files — this may take 15-30 seconds
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-lg">
          <div className="bg-surface border border-red-900/50 rounded-lg p-6">
            <div className="flex items-center gap-2 text-xs text-muted mb-4">
              <span className="text-red-500">~</span>
              <span>hn.persona</span>
              <span className="text-border">|</span>
              <span className="text-red-500">error</span>
            </div>
            <div className="text-sm text-red-400">{error}</div>
            <div className="mt-4 flex gap-4">
              <Link href="/" className="text-xs text-accent hover:text-accent/80 transition-colors">
                &larr; try another username
              </Link>
              <Link
                href={`/user/${decodeURIComponent(username)}`}
                className="text-xs text-muted hover:text-accent transition-colors"
              >
                try quick profile instead
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!profile) return null;

  return <DeepView profile={profile} />;
}
