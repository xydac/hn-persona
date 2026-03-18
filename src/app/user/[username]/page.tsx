"use client";

import { useEffect, useState, use } from "react";
import { PersonaProfile } from "@/lib/analyzer";
import PersonaView from "@/components/PersonaView";
import Link from "next/link";

const LOADING_MESSAGES = [
  "connecting to HN API...",
  "fetching user profile...",
  "loading submitted items...",
  "analyzing posting patterns...",
  "extracting topic interests...",
  "profiling writing style...",
  "computing personality traits...",
  "generating persona...",
];

export default function UserPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const [profile, setProfile] = useState<PersonaProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingMsg((prev) => {
        if (prev < LOADING_MESSAGES.length - 1) return prev + 1;
        return prev;
      });
    }, 1500);

    fetch(`/api/analyze?username=${encodeURIComponent(username)}`)
      .then((res) => {
        if (!res.ok) {
          return res.json().then((data) => {
            throw new Error(data.error || "Failed to fetch");
          });
        }
        return res.json();
      })
      .then((data) => {
        setProfile(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });

    return () => clearInterval(interval);
  }, [username]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-lg space-y-6">
          <div className="bg-surface border border-border rounded-lg p-6">
            <div className="flex items-center gap-2 text-xs text-muted mb-4">
              <span className="text-accent">~</span>
              <span>hn.persona</span>
              <span className="text-border">|</span>
              <span>analyzing <span className="text-foreground">{decodeURIComponent(username)}</span></span>
            </div>

            <div className="space-y-2 font-mono text-sm">
              {LOADING_MESSAGES.slice(0, loadingMsg + 1).map((msg, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 ${
                    i < loadingMsg ? "text-muted" : "text-accent"
                  }`}
                >
                  <span className={i < loadingMsg ? "text-muted" : "text-accent"}>
                    {i < loadingMsg ? "[done]" : "[....] "}
                  </span>
                  <span>{msg}</span>
                  {i === loadingMsg && <span className="w-2 h-3 bg-accent cursor-blink" />}
                </div>
              ))}
            </div>

            <div className="mt-6 h-1 bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent/60 rounded-full transition-all duration-1000"
                style={{ width: `${((loadingMsg + 1) / LOADING_MESSAGES.length) * 100}%` }}
              />
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
            <div className="text-sm">
              <span className="text-red-500">$ </span>
              <span className="text-muted">analyze {decodeURIComponent(username)}</span>
            </div>
            <div className="text-sm text-red-400 mt-2">
              Error: {error}
            </div>
            <div className="mt-4">
              <Link
                href="/"
                className="text-xs text-accent hover:text-accent/80 transition-colors"
              >
                &larr; try another username
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!profile) return null;

  return <PersonaView profile={profile} />;
}
