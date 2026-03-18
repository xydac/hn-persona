"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [username, setUsername] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (trimmed) {
      router.push(`/user/${encodeURIComponent(trimmed)}`);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Logo */}
        <div className="text-center space-y-4 fade-in">
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 bg-hn-orange rounded-sm flex items-center justify-center text-background font-bold text-lg">
              Y
            </div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-hn-orange">hn</span>
              <span className="text-muted">.</span>
              <span className="text-accent">persona</span>
            </h1>
          </div>
          <p className="text-muted text-sm">
            Deep-dive into any Hacker News user&apos;s digital persona
          </p>
        </div>

        {/* Terminal Input */}
        <div className="fade-in fade-in-delay-1">
          <form onSubmit={handleSubmit}>
            <div
              className={`bg-surface border rounded-lg p-4 transition-all duration-300 ${
                isFocused ? "border-accent shadow-[0_0_15px_rgba(0,255,136,0.1)]" : "border-border"
              }`}
            >
              <div className="flex items-center gap-2 text-muted text-xs mb-3">
                <span className="text-accent">~</span>
                <span>hn.persona</span>
                <span className="text-border">|</span>
                <span>user analysis v1.0</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-accent text-sm">$</span>
                <span className="text-muted text-sm">analyze</span>
                <input
                  ref={inputRef}
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="enter_username"
                  className="flex-1 bg-transparent outline-none text-foreground text-sm placeholder:text-border"
                  autoComplete="off"
                  spellCheck={false}
                />
                {isFocused && !username && (
                  <span className="w-2 h-4 bg-accent cursor-blink" />
                )}
              </div>
            </div>
          </form>

          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted">
            <span>press <kbd className="bg-surface-2 px-1.5 py-0.5 rounded border border-border text-foreground">Enter</kbd> to analyze</span>
          </div>
        </div>

        {/* Examples */}
        <div className="fade-in fade-in-delay-2 text-center">
          <p className="text-xs text-muted mb-3">try these:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {["pg", "dang", "patio11", "tptacek", "jacquesm"].map((name) => (
              <button
                key={name}
                onClick={() => router.push(`/user/${name}`)}
                className="text-xs bg-surface border border-border px-3 py-1.5 rounded hover:border-accent hover:text-accent transition-all duration-200"
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="fade-in fade-in-delay-3 text-center space-y-2">
          <div className="flex items-center justify-center gap-4 text-xs text-border">
            <span>analyzes up to 200 recent items</span>
            <span>&#183;</span>
            <span>uses official HN API</span>
            <span>&#183;</span>
            <span>no data stored</span>
          </div>
        </div>
      </div>
    </main>
  );
}
