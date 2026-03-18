import { HNUser, HNItem } from "./hn-api";

export interface PersonaProfile {
  user: {
    username: string;
    karma: number;
    accountAge: string;
    accountAgeDays: number;
    createdDate: string;
    about: string;
  };
  stats: {
    totalItems: number;
    totalStories: number;
    totalComments: number;
    avgScore: number;
    maxScore: number;
    totalDescendants: number;
    karmaPerDay: number;
  };
  topStories: {
    title: string;
    url?: string;
    score: number;
    comments: number;
    date: string;
    hnUrl: string;
  }[];
  topComments: {
    text: string;
    score: number;
    date: string;
    hnUrl: string;
    parentId: number;
  }[];
  topics: { name: string; count: number; percentage: number }[];
  activityByHour: number[];
  activityByDay: number[];
  activityTimeline: { month: string; count: number }[];
  writingStyle: {
    avgLength: number;
    vocabulary: number;
    avgSentenceLength: number;
    questionRatio: number;
    exclamationRatio: number;
    linkRatio: number;
    codeRatio: number;
    readabilityLevel: string;
  };
  engagement: {
    responseRate: number;
    avgResponseTime: string;
    threadDepth: number;
    topDomains: { domain: string; count: number }[];
  };
  personality: {
    traits: { name: string; score: number; description: string }[];
    archetype: string;
    archetypeDescription: string;
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatAge(days: number): string {
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  if (years > 0) return `${years}y ${months}m`;
  if (months > 0) return `${months}m`;
  return `${days}d`;
}

const TECH_TOPICS: Record<string, string[]> = {
  "AI/ML": ["ai", "machine learning", "deep learning", "neural", "gpt", "llm", "chatgpt", "openai", "transformer", "diffusion", "stable diffusion", "midjourney", "anthropic", "claude", "gemini", "artificial intelligence", "nlp", "computer vision"],
  "Web Dev": ["react", "nextjs", "next.js", "vue", "angular", "svelte", "javascript", "typescript", "css", "html", "webpack", "vite", "frontend", "front-end", "tailwind", "node.js", "nodejs", "deno", "bun"],
  "Systems": ["rust", "c++", "linux", "kernel", "systems programming", "memory", "performance", "compiler", "assembly", "embedded", "rtos", "operating system"],
  "Cloud/Infra": ["aws", "gcp", "azure", "kubernetes", "docker", "terraform", "devops", "ci/cd", "infrastructure", "cloud", "serverless", "lambda", "microservices"],
  "Databases": ["sql", "postgres", "postgresql", "mysql", "mongodb", "redis", "database", "nosql", "sqlite", "elasticsearch", "cassandra", "dynamodb"],
  "Security": ["security", "encryption", "vulnerability", "hack", "crypto", "cryptography", "privacy", "authentication", "zero-day", "exploit", "malware"],
  "Crypto/Web3": ["bitcoin", "ethereum", "blockchain", "cryptocurrency", "web3", "defi", "nft", "token", "mining", "solana"],
  "Mobile": ["ios", "android", "swift", "kotlin", "react native", "flutter", "mobile app"],
  "Python": ["python", "django", "flask", "fastapi", "pandas", "numpy", "jupyter"],
  "Go": ["golang", "go language", "goroutine"],
  "Startups": ["startup", "vc", "venture capital", "funding", "yc", "y combinator", "founder", "seed round", "series a", "bootstrapped", "saas"],
  "Career": ["hiring", "interview", "resume", "salary", "remote work", "layoff", "job", "career", "engineer", "developer"],
  "Open Source": ["open source", "github", "gitlab", "oss", "license", "mit license", "gpl", "contributor", "fork"],
  "Data/Analytics": ["data science", "analytics", "visualization", "dashboard", "metrics", "etl", "data pipeline", "spark", "hadoop"],
  "Networking": ["tcp", "http", "dns", "cdn", "networking", "protocol", "ipv6", "bgp", "latency", "bandwidth"],
  "Hardware": ["chip", "semiconductor", "cpu", "gpu", "fpga", "risc-v", "arm", "apple silicon", "hardware"],
  "Science": ["physics", "biology", "chemistry", "math", "research", "paper", "study", "science", "quantum", "space", "nasa"],
  "Culture": ["book", "reading", "philosophy", "society", "politics", "education", "productivity", "mental health", "burnout"],
};

function extractTopics(items: HNItem[]): { name: string; count: number; percentage: number }[] {
  const topicCounts: Record<string, number> = {};
  const totalItems = items.length;

  for (const item of items) {
    const text = ((item.title || "") + " " + stripHtml(item.text || "")).toLowerCase();
    const matchedTopics = new Set<string>();

    for (const [topic, keywords] of Object.entries(TECH_TOPICS)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          matchedTopics.add(topic);
          break;
        }
      }
    }

    for (const topic of matchedTopics) {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    }
  }

  return Object.entries(topicCounts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / totalItems) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);
}

function analyzeWritingStyle(comments: HNItem[]): PersonaProfile["writingStyle"] {
  const texts = comments
    .map((c) => stripHtml(c.text || ""))
    .filter((t) => t.length > 0);

  if (texts.length === 0) {
    return {
      avgLength: 0,
      vocabulary: 0,
      avgSentenceLength: 0,
      questionRatio: 0,
      exclamationRatio: 0,
      linkRatio: 0,
      codeRatio: 0,
      readabilityLevel: "N/A",
    };
  }

  const totalLength = texts.reduce((sum, t) => sum + t.length, 0);
  const avgLength = Math.round(totalLength / texts.length);

  const allWords = texts.join(" ").toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const uniqueWords = new Set(allWords);
  const vocabulary = uniqueWords.size;

  const allSentences = texts.join(" ").split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const avgSentenceLength = allSentences.length > 0
    ? Math.round(allWords.length / allSentences.length)
    : 0;

  const questionCount = texts.filter((t) => t.includes("?")).length;
  const exclamationCount = texts.filter((t) => t.includes("!")).length;
  const linkCount = comments.filter((c) => (c.text || "").includes("href")).length;
  const codeCount = comments.filter((c) => (c.text || "").includes("<code>") || (c.text || "").includes("<pre>")).length;

  let readabilityLevel: string;
  if (avgSentenceLength > 25) readabilityLevel = "Academic";
  else if (avgSentenceLength > 18) readabilityLevel = "Technical";
  else if (avgSentenceLength > 12) readabilityLevel = "Clear";
  else readabilityLevel = "Concise";

  return {
    avgLength,
    vocabulary,
    avgSentenceLength,
    questionRatio: Math.round((questionCount / texts.length) * 100),
    exclamationRatio: Math.round((exclamationCount / texts.length) * 100),
    linkRatio: Math.round((linkCount / texts.length) * 100),
    codeRatio: Math.round((codeCount / texts.length) * 100),
    readabilityLevel,
  };
}

function analyzePersonality(
  items: HNItem[],
  stories: HNItem[],
  comments: HNItem[],
  writingStyle: PersonaProfile["writingStyle"],
  topics: PersonaProfile["topics"],
): PersonaProfile["personality"] {
  const traits: { name: string; score: number; description: string }[] = [];

  // Technical depth
  const technicalTopics = topics.filter((t) =>
    ["Systems", "Databases", "Networking", "Security", "Hardware"].includes(t.name)
  );
  const technicalScore = Math.min(100, technicalTopics.reduce((s, t) => s + t.percentage, 0) * 2);
  traits.push({
    name: "Technical Depth",
    score: technicalScore,
    description: technicalScore > 60
      ? "Deep diver into low-level systems and infrastructure"
      : technicalScore > 30
        ? "Balanced between high-level and technical discussions"
        : "Focuses more on high-level concepts and applications",
  });

  // Community engagement
  const commentRatio = items.length > 0 ? (comments.length / items.length) * 100 : 0;
  const engagementScore = Math.min(100, Math.round(commentRatio * 1.2));
  traits.push({
    name: "Community Engagement",
    score: engagementScore,
    description: engagementScore > 70
      ? "Highly active commenter and discussion participant"
      : engagementScore > 40
        ? "Moderate engagement in community discussions"
        : "Primarily a content sharer rather than commenter",
  });

  // Curiosity (question asking)
  const curiosityScore = Math.min(100, writingStyle.questionRatio * 3);
  traits.push({
    name: "Curiosity",
    score: curiosityScore,
    description: curiosityScore > 60
      ? "Frequently asks questions and seeks understanding"
      : curiosityScore > 30
        ? "Occasionally probes deeper with questions"
        : "More declarative communication style",
  });

  // Content creation
  const creatorScore = items.length > 0
    ? Math.min(100, Math.round((stories.length / items.length) * 200))
    : 0;
  traits.push({
    name: "Content Creation",
    score: creatorScore,
    description: creatorScore > 60
      ? "Prolific content submitter and curator"
      : creatorScore > 30
        ? "Balanced between sharing and discussing"
        : "Prefers engaging with existing content",
  });

  // Verbosity
  const verbosityScore = Math.min(100, Math.round(writingStyle.avgLength / 5));
  traits.push({
    name: "Verbosity",
    score: verbosityScore,
    description: verbosityScore > 60
      ? "Writes detailed, thorough responses"
      : verbosityScore > 30
        ? "Balanced response length"
        : "Concise and to-the-point communicator",
  });

  // Evidence-based
  const evidenceScore = Math.min(100, writingStyle.linkRatio * 3 + writingStyle.codeRatio * 3);
  traits.push({
    name: "Evidence-Based",
    score: evidenceScore,
    description: evidenceScore > 60
      ? "Frequently backs up claims with links and code"
      : evidenceScore > 30
        ? "Sometimes provides supporting evidence"
        : "Relies more on assertions and experience",
  });

  // Determine archetype
  let archetype: string;
  let archetypeDescription: string;

  if (technicalScore > 60 && verbosityScore > 50) {
    archetype = "The Deep Diver";
    archetypeDescription = "A technically-minded individual who goes deep on topics, providing thorough analysis and detailed explanations. Values precision and completeness.";
  } else if (creatorScore > 60 && engagementScore < 40) {
    archetype = "The Curator";
    archetypeDescription = "A prolific content discoverer who shares interesting finds with the community. More of a broadcaster than a conversationalist.";
  } else if (engagementScore > 70 && curiosityScore > 50) {
    archetype = "The Socratic";
    archetypeDescription = "An engaged community member who learns through questioning and dialogue. Drives discussions forward by asking the right questions.";
  } else if (engagementScore > 70 && verbosityScore > 50) {
    archetype = "The Mentor";
    archetypeDescription = "An experienced voice who shares knowledge generously. Writes detailed comments to help others understand complex topics.";
  } else if (creatorScore > 40 && engagementScore > 40) {
    archetype = "The Polymath";
    archetypeDescription = "A well-rounded contributor who both shares content and engages in discussions across diverse topics.";
  } else if (technicalScore > 50 && verbosityScore < 30) {
    archetype = "The Pragmatist";
    archetypeDescription = "A no-nonsense technical mind who communicates efficiently. Values brevity and practical solutions over lengthy discussions.";
  } else if (curiosityScore > 60) {
    archetype = "The Explorer";
    archetypeDescription = "A curious mind constantly seeking new knowledge and perspectives. Approaches topics with genuine intellectual curiosity.";
  } else {
    archetype = "The Observer";
    archetypeDescription = "A thoughtful participant who engages selectively. When they speak, it's deliberate and considered.";
  }

  return { traits, archetype, archetypeDescription };
}

export function analyzeUser(user: HNUser, items: HNItem[]): PersonaProfile {
  const now = Date.now() / 1000;
  const ageDays = Math.floor((now - user.created) / 86400);
  const createdDate = new Date(user.created * 1000).toISOString().split("T")[0];

  const stories = items.filter((i) => i.type === "story");
  const comments = items.filter((i) => i.type === "comment");

  const storyScores = stories.filter((s) => s.score != null).map((s) => s.score!);
  const avgScore = storyScores.length > 0
    ? Math.round(storyScores.reduce((a, b) => a + b, 0) / storyScores.length)
    : 0;
  const maxScore = storyScores.length > 0 ? Math.max(...storyScores) : 0;
  const totalDescendants = stories.reduce((sum, s) => sum + (s.descendants || 0), 0);

  // Activity by hour and day
  const activityByHour = new Array(24).fill(0);
  const activityByDay = new Array(7).fill(0);
  for (const item of items) {
    const date = new Date(item.time * 1000);
    activityByHour[date.getUTCHours()]++;
    activityByDay[date.getUTCDay()]++;
  }

  // Activity timeline (last 12 months)
  const activityTimeline: { month: string; count: number }[] = [];
  const monthCounts: Record<string, number> = {};
  for (const item of items) {
    const date = new Date(item.time * 1000);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthCounts[key] = (monthCounts[key] || 0) + 1;
  }
  const sortedMonths = Object.keys(monthCounts).sort().slice(-24);
  for (const month of sortedMonths) {
    activityTimeline.push({ month, count: monthCounts[month] });
  }

  // Top stories
  const topStories = stories
    .filter((s) => s.score != null)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 5)
    .map((s) => ({
      title: s.title || "Untitled",
      url: s.url,
      score: s.score || 0,
      comments: s.descendants || 0,
      date: new Date(s.time * 1000).toISOString().split("T")[0],
      hnUrl: `https://news.ycombinator.com/item?id=${s.id}`,
    }));

  // Top comments (by kids count as proxy for engagement)
  const topComments = comments
    .filter((c) => c.text && c.kids && c.kids.length > 0)
    .sort((a, b) => (b.kids?.length || 0) - (a.kids?.length || 0))
    .slice(0, 5)
    .map((c) => ({
      text: stripHtml(c.text || "").slice(0, 300),
      score: c.kids?.length || 0,
      date: new Date(c.time * 1000).toISOString().split("T")[0],
      hnUrl: `https://news.ycombinator.com/item?id=${c.id}`,
      parentId: c.parent || 0,
    }));

  const topics = extractTopics(items);
  const writingStyle = analyzeWritingStyle(comments);

  // Engagement
  const urls = stories.filter((s) => s.url).map((s) => {
    try {
      return new URL(s.url!).hostname.replace("www.", "");
    } catch {
      return null;
    }
  }).filter(Boolean) as string[];

  const domainCounts: Record<string, number> = {};
  for (const domain of urls) {
    domainCounts[domain] = (domainCounts[domain] || 0) + 1;
  }
  const topDomains = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([domain, count]) => ({ domain, count }));

  const personality = analyzePersonality(items, stories, comments, writingStyle, topics);

  return {
    user: {
      username: user.id,
      karma: user.karma,
      accountAge: formatAge(ageDays),
      accountAgeDays: ageDays,
      createdDate,
      about: user.about ? stripHtml(user.about) : "",
    },
    stats: {
      totalItems: items.length,
      totalStories: stories.length,
      totalComments: comments.length,
      avgScore,
      maxScore,
      totalDescendants,
      karmaPerDay: Math.round((user.karma / Math.max(ageDays, 1)) * 10) / 10,
    },
    topStories,
    topComments,
    topics,
    activityByHour,
    activityByDay,
    activityTimeline,
    writingStyle,
    engagement: {
      responseRate: items.length > 0 ? Math.round((comments.length / items.length) * 100) : 0,
      avgResponseTime: "N/A",
      threadDepth: 0,
      topDomains,
    },
    personality,
  };
}
