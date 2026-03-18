import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "hn.persona — Hacker News User Profiler",
  description: "Deep-dive into any Hacker News user's digital persona. Analyze posting patterns, interests, writing style, and community engagement.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistMono.variable} font-mono antialiased bg-background text-foreground`}>
        <div className="scanline" />
        {children}
      </body>
    </html>
  );
}
