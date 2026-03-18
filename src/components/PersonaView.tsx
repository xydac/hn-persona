"use client";

import { PersonaProfile } from "@/lib/analyzer";
import Link from "next/link";

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="text-xs text-muted mb-1">{label}</div>
      <div className="text-xl font-bold text-foreground">{value}</div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </div>
  );
}

function BarChart({ data, maxVal, colorClass = "bg-accent" }: { data: { label: string; value: number }[]; maxVal: number; colorClass?: string }) {
  return (
    <div className="space-y-1.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2 text-xs">
          <span className="w-8 text-right text-muted shrink-0">{d.label}</span>
          <div className="flex-1 h-4 bg-surface-2 rounded-sm overflow-hidden">
            <div
              className={`h-full ${colorClass} rounded-sm transition-all duration-500`}
              style={{ width: `${maxVal > 0 ? (d.value / maxVal) * 100 : 0}%` }}
            />
          </div>
          <span className="w-8 text-right text-muted shrink-0">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

function TraitBar({ name, score, description }: { name: string; score: number; description: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-foreground">{name}</span>
        <span className="text-muted">{score}%</span>
      </div>
      <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${score}%`,
            background: `linear-gradient(90deg, var(--accent-dim), var(--accent))`,
          }}
        />
      </div>
      <div className="text-xs text-muted">{description}</div>
    </div>
  );
}

function HourlyChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[2px] h-24">
      {data.map((val, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-accent/70 rounded-t-sm transition-all duration-300 hover:bg-accent min-h-[1px]"
            style={{ height: `${(val / max) * 100}%` }}
            title={`${i}:00 UTC - ${val} items`}
          />
          {i % 4 === 0 && (
            <span className="text-[9px] text-muted">{i}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function TimelineChart({ data }: { data: { month: string; count: number }[] }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-[2px] h-20">
      {data.map((d) => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-hn-orange/70 rounded-t-sm transition-all duration-300 hover:bg-hn-orange min-h-[1px]"
            style={{ height: `${(d.count / max) * 100}%` }}
            title={`${d.month}: ${d.count} items`}
          />
        </div>
      ))}
    </div>
  );
}

export default function PersonaView({ profile }: { profile: PersonaProfile }) {
  const { user, stats, topStories, topComments, topics, activityByHour, activityByDay, activityTimeline, writingStyle, engagement, personality } = profile;

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayMax = Math.max(...activityByDay, 1);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
          <div className="text-xs text-muted">
            analyzed {stats.totalItems} items
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* User Header */}
        <section className="fade-in">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-foreground">{user.username}</h1>
                <a
                  href={`https://news.ycombinator.com/user?id=${user.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-hn-orange/10 text-hn-orange px-2 py-0.5 rounded border border-hn-orange/20 hover:bg-hn-orange/20 transition-colors"
                >
                  HN Profile &rarr;
                </a>
              </div>
              {user.about && (
                <p className="text-sm text-muted max-w-2xl leading-relaxed">{user.about}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs text-muted">
                <span>joined {user.createdDate}</span>
                <span className="text-border">|</span>
                <span>active for {user.accountAge}</span>
              </div>
            </div>
            {/* Archetype Badge */}
            <div className="bg-surface border border-accent/20 rounded-lg p-4 md:text-right shrink-0">
              <div className="text-xs text-accent mb-1">archetype</div>
              <div className="text-lg font-bold text-accent text-glow">{personality.archetype}</div>
              <div className="text-xs text-muted max-w-xs mt-1">{personality.archetypeDescription}</div>
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="fade-in fade-in-delay-1">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <StatCard label="karma" value={user.karma.toLocaleString()} sub={`${stats.karmaPerDay}/day`} />
            <StatCard label="stories" value={stats.totalStories} />
            <StatCard label="comments" value={stats.totalComments} />
            <StatCard label="avg score" value={stats.avgScore} sub={`max: ${stats.maxScore}`} />
            <StatCard label="discussions" value={stats.totalDescendants.toLocaleString()} sub="total replies" />
            <StatCard label="account age" value={user.accountAge} sub={user.createdDate} />
          </div>
        </section>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Topics */}
          <section className="fade-in fade-in-delay-2 bg-surface border border-border rounded-lg p-5">
            <h2 className="text-sm font-bold text-accent mb-4 flex items-center gap-2">
              <span className="text-hn-orange">#</span> Topic Interests
            </h2>
            {topics.length > 0 ? (
              <div className="space-y-2">
                {topics.map((topic) => (
                  <div key={topic.name} className="flex items-center gap-3 text-xs">
                    <span className="w-24 text-foreground shrink-0">{topic.name}</span>
                    <div className="flex-1 h-3 bg-surface-2 rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-accent/60 rounded-sm"
                        style={{ width: `${topic.percentage}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-muted shrink-0">{topic.count} ({topic.percentage}%)</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted">Not enough data to determine topics</p>
            )}
          </section>

          {/* Personality Traits */}
          <section className="fade-in fade-in-delay-3 bg-surface border border-border rounded-lg p-5">
            <h2 className="text-sm font-bold text-accent mb-4 flex items-center gap-2">
              <span className="text-hn-orange">&gt;</span> Personality Traits
            </h2>
            <div className="space-y-4">
              {personality.traits.map((trait) => (
                <TraitBar key={trait.name} {...trait} />
              ))}
            </div>
          </section>
        </div>

        {/* Activity Patterns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="fade-in fade-in-delay-4 bg-surface border border-border rounded-lg p-5">
            <h2 className="text-sm font-bold text-accent mb-4">Activity by Hour (UTC)</h2>
            <HourlyChart data={activityByHour} />
          </section>

          <section className="fade-in fade-in-delay-4 bg-surface border border-border rounded-lg p-5">
            <h2 className="text-sm font-bold text-accent mb-4">Activity by Day</h2>
            <BarChart
              data={activityByDay.map((val, i) => ({ label: dayLabels[i], value: val }))}
              maxVal={dayMax}
            />
          </section>

          <section className="fade-in fade-in-delay-4 bg-surface border border-border rounded-lg p-5">
            <h2 className="text-sm font-bold text-accent mb-4">Timeline (Monthly)</h2>
            {activityTimeline.length > 0 ? (
              <>
                <TimelineChart data={activityTimeline} />
                <div className="flex justify-between text-[9px] text-muted mt-1">
                  <span>{activityTimeline[0]?.month}</span>
                  <span>{activityTimeline[activityTimeline.length - 1]?.month}</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted">No timeline data</p>
            )}
          </section>
        </div>

        {/* Writing Style */}
        <section className="fade-in fade-in-delay-5 bg-surface border border-border rounded-lg p-5">
          <h2 className="text-sm font-bold text-accent mb-4 flex items-center gap-2">
            <span className="text-hn-orange">_</span> Writing Style
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <div>
              <div className="text-xs text-muted">avg length</div>
              <div className="text-lg font-bold">{writingStyle.avgLength}</div>
              <div className="text-[10px] text-muted">chars</div>
            </div>
            <div>
              <div className="text-xs text-muted">vocabulary</div>
              <div className="text-lg font-bold">{writingStyle.vocabulary.toLocaleString()}</div>
              <div className="text-[10px] text-muted">unique words</div>
            </div>
            <div>
              <div className="text-xs text-muted">sentence len</div>
              <div className="text-lg font-bold">{writingStyle.avgSentenceLength}</div>
              <div className="text-[10px] text-muted">words/sentence</div>
            </div>
            <div>
              <div className="text-xs text-muted">readability</div>
              <div className="text-lg font-bold text-accent">{writingStyle.readabilityLevel}</div>
            </div>
            <div>
              <div className="text-xs text-muted">questions</div>
              <div className="text-lg font-bold">{writingStyle.questionRatio}%</div>
            </div>
            <div>
              <div className="text-xs text-muted">with links</div>
              <div className="text-lg font-bold">{writingStyle.linkRatio}%</div>
            </div>
            <div>
              <div className="text-xs text-muted">with code</div>
              <div className="text-lg font-bold">{writingStyle.codeRatio}%</div>
            </div>
            <div>
              <div className="text-xs text-muted">exclamations</div>
              <div className="text-lg font-bold">{writingStyle.exclamationRatio}%</div>
            </div>
          </div>
        </section>

        {/* Top Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Stories */}
          <section className="fade-in fade-in-delay-5 bg-surface border border-border rounded-lg p-5">
            <h2 className="text-sm font-bold text-accent mb-4 flex items-center gap-2">
              <span className="text-hn-orange">^</span> Top Stories
            </h2>
            {topStories.length > 0 ? (
              <div className="space-y-3">
                {topStories.map((story, i) => (
                  <div key={i} className="border-b border-border/50 pb-3 last:border-0 last:pb-0">
                    <a
                      href={story.hnUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-foreground hover:text-accent transition-colors"
                    >
                      {story.title}
                    </a>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                      <span className="text-hn-orange">{story.score} pts</span>
                      <span>{story.comments} comments</span>
                      <span>{story.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted">No stories found</p>
            )}
          </section>

          {/* Top Comments */}
          <section className="fade-in fade-in-delay-5 bg-surface border border-border rounded-lg p-5">
            <h2 className="text-sm font-bold text-accent mb-4 flex items-center gap-2">
              <span className="text-hn-orange">&gt;</span> Most Discussed Comments
            </h2>
            {topComments.length > 0 ? (
              <div className="space-y-3">
                {topComments.map((comment, i) => (
                  <div key={i} className="border-b border-border/50 pb-3 last:border-0 last:pb-0">
                    <a
                      href={comment.hnUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-foreground hover:text-accent transition-colors leading-relaxed line-clamp-3"
                    >
                      &quot;{comment.text}&quot;
                    </a>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                      <span className="text-hn-orange">{comment.score} replies</span>
                      <span>{comment.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted">No notable comments found</p>
            )}
          </section>
        </div>

        {/* Domain Fingerprint */}
        {engagement.topDomains.length > 0 && (
          <section className="fade-in fade-in-delay-6 bg-surface border border-border rounded-lg p-5">
            <h2 className="text-sm font-bold text-accent mb-4 flex items-center gap-2">
              <span className="text-hn-orange">@</span> Domain Fingerprint
            </h2>
            <div className="flex flex-wrap gap-2">
              {engagement.topDomains.map((d) => (
                <div
                  key={d.domain}
                  className="bg-surface-2 border border-border rounded px-3 py-1.5 text-xs"
                >
                  <span className="text-foreground">{d.domain}</span>
                  <span className="text-muted ml-2">x{d.count}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="text-center py-8 text-xs text-border">
          <p>built with the official HN API &middot; data analyzed at request time &middot; no data stored</p>
          <p className="mt-1">
            <Link href="/" className="text-muted hover:text-accent transition-colors">
              analyze another user
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
