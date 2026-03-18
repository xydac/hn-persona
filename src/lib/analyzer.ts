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
  "AI/ML": ["machine learning", "deep learning", "neural network", "gpt-4", "gpt-3", "chatgpt", "openai", "transformer", "stable diffusion", "midjourney", "anthropic", "artificial intelligence", "computer vision", "large language model", "llm", "diffusion model", "nlp"],
  "Web Dev": ["react", "nextjs", "next.js", "vue.js", "angular", "svelte", "javascript", "typescript", "webpack", "frontend", "front-end", "tailwind", "node.js", "nodejs", "css", "html5"],
  "Systems": ["rust", "c++", "linux", "kernel", "systems programming", "memory management", "compiler", "assembly", "embedded", "operating system", "malloc", "segfault", "syscall", "linker", "garbage collector"],
  "Cloud/Infra": ["aws", "kubernetes", "docker", "terraform", "devops", "serverless", "microservices", "ci/cd", "lambda", "cloudflare"],
  "Databases": ["postgres", "postgresql", "mysql", "mongodb", "redis", "database", "nosql", "sqlite", "elasticsearch", "sql"],
  "Security": ["security", "encryption", "vulnerability", "cryptography", "zero-day", "exploit", "malware", "infosec", "penetration test", "tls", "ssl", "authentication"],
  "Crypto/Web3": ["bitcoin", "ethereum", "blockchain", "cryptocurrency", "web3", "defi", "solana", "smart contract"],
  "Mobile": ["ios", "android", "swift", "kotlin", "react native", "flutter", "mobile app"],
  "Python": ["python", "django", "flask", "fastapi", "pandas", "numpy", "jupyter"],
  "Go": ["golang", "goroutine"],
  "Startups": ["startup", "venture capital", "y combinator", "seed round", "series a", "bootstrapped", "saas", "founder"],
  "Career": ["hiring", "interview", "salary", "remote work", "layoff", "job market", "resume"],
  "Open Source": ["open source", "open-source", "github", "gitlab", "oss"],
  "Data/Analytics": ["data science", "data pipeline", "analytics", "etl", "hadoop", "apache spark", "visualization"],
  "Networking": ["tcp", "dns", "networking", "protocol", "ipv6", "bgp", "latency", "bandwidth", "cdn"],
  "Hardware": ["semiconductor", "cpu", "gpu", "fpga", "risc-v", "apple silicon", "chip", "transistor"],
  "Science": ["physics", "biology", "chemistry", "quantum", "space", "nasa", "research"],
  "Culture": ["philosophy", "society", "education", "mental health", "burnout", "book"],
};

// Match keywords using word boundaries to avoid false positives
function matchesKeyword(text: string, keyword: string): boolean {
  // For multi-word phrases, simple includes is fine (low false positive risk)
  if (keyword.includes(" ") || keyword.includes("/") || keyword.includes("-") || keyword.includes(".")) {
    return text.includes(keyword);
  }
  // For single words, use word boundary matching
  const re = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  return re.test(text);
}

function extractTopics(items: HNItem[]): { name: string; count: number; percentage: number }[] {
  const topicCounts: Record<string, number> = {};
  const totalItems = items.length;

  for (const item of items) {
    const text = ((item.title || "") + " " + stripHtml(item.text || "")).toLowerCase();
    const matchedTopics = new Set<string>();

    for (const [topic, keywords] of Object.entries(TECH_TOPICS)) {
      for (const keyword of keywords) {
        if (matchesKeyword(text, keyword)) {
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

// Attempt to detect sentiment signals from text
function analyzeSentiment(texts: string[]): { positivity: number; disagreement: number; helpfulness: number } {
  if (texts.length === 0) return { positivity: 0, disagreement: 0, helpfulness: 0 };

  const positiveWords = ["great", "awesome", "excellent", "love", "good", "nice", "thank", "thanks", "agree", "amazing", "brilliant", "wonderful", "fantastic", "helpful", "appreciate", "cool", "beautiful", "elegant", "impressive", "well done", "congrats", "exactly", "perfect"];
  const negativeWords = ["disagree", "wrong", "bad", "terrible", "hate", "awful", "no,", "nope", "actually,", "incorrect", "false", "but ", "however", "unfortunately", "problem with", "issue with", "not really", "I don't think", "that's not"];
  const helpfulWords = ["try", "you can", "you could", "here's", "here is", "for example", "e.g.", "i.e.", "suggestion", "recommend", "tip:", "hint:", "fyi", "note that", "keep in mind", "one approach", "another option", "alternatively", "have you tried", "you might", "consider"];

  let positiveCount = 0;
  let negativeCount = 0;
  let helpfulCount = 0;

  for (const text of texts) {
    const lower = text.toLowerCase();
    for (const word of positiveWords) {
      if (lower.includes(word)) { positiveCount++; break; }
    }
    for (const word of negativeWords) {
      if (lower.includes(word)) { negativeCount++; break; }
    }
    for (const word of helpfulWords) {
      if (lower.includes(word)) { helpfulCount++; break; }
    }
  }

  return {
    positivity: Math.round((positiveCount / texts.length) * 100),
    disagreement: Math.round((negativeCount / texts.length) * 100),
    helpfulness: Math.round((helpfulCount / texts.length) * 100),
  };
}

function analyzePersonality(
  items: HNItem[],
  stories: HNItem[],
  comments: HNItem[],
  writingStyle: PersonaProfile["writingStyle"],
  topics: PersonaProfile["topics"],
  user: HNUser,
): PersonaProfile["personality"] {
  const traits: { name: string; score: number; description: string }[] = [];

  const commentTexts = comments
    .map((c) => stripHtml(c.text || ""))
    .filter((t) => t.length > 0);
  const sentiment = analyzeSentiment(commentTexts);

  // --- Technical Depth ---
  // Count ALL tech topics, not just low-level infra. Weight deeper topics more.
  const deepTopics = ["Systems", "Databases", "Networking", "Security", "Hardware"];
  const midTopics = ["Python", "Go", "Cloud/Infra", "Data/Analytics"];
  const broadTopics = ["AI/ML", "Web Dev", "Mobile", "Open Source"];

  let techSignal = 0;
  for (const t of topics) {
    if (deepTopics.includes(t.name)) techSignal += t.percentage * 1.5;
    else if (midTopics.includes(t.name)) techSignal += t.percentage * 1.2;
    else if (broadTopics.includes(t.name)) techSignal += t.percentage * 0.8;
  }
  // Also factor in code usage — people who share code are technical
  techSignal += writingStyle.codeRatio * 2;
  const technicalScore = Math.min(100, Math.round(techSignal));

  traits.push({
    name: "Technical Depth",
    score: technicalScore,
    description: technicalScore > 70
      ? "Deeply technical — regularly engages with low-level systems, code, and infrastructure"
      : technicalScore > 45
        ? "Technically fluent — comfortable discussing software, tools, and engineering"
        : technicalScore > 20
          ? "Tech-aware — follows technology trends but focuses on higher-level discussion"
          : "Non-technical focus — primarily engages with ideas, culture, or business topics",
  });

  // --- Community Engagement ---
  // Use a logarithmic scale based on total items and comment-to-story ratio
  // Also factor in reply threads (kids on comments = others replying = engagement)
  const totalRepliesReceived = comments.reduce((sum, c) => sum + (c.kids?.length || 0), 0);
  const avgRepliesPerComment = comments.length > 0 ? totalRepliesReceived / comments.length : 0;
  const commentRatio = items.length > 0 ? comments.length / items.length : 0;

  // Blend: comment ratio (are they discussing?), reply magnetism (do people respond?), volume
  const engagementRaw =
    commentRatio * 40 +                                          // 0-40: how much they comment vs post
    Math.min(30, avgRepliesPerComment * 10) +                    // 0-30: how much engagement their comments get
    Math.min(30, Math.log2(Math.max(1, items.length)) * 4);      // 0-30: overall volume (log scale)
  const engagementScore = Math.min(100, Math.round(engagementRaw));

  traits.push({
    name: "Community Engagement",
    score: engagementScore,
    description: engagementScore > 70
      ? "Highly engaged — active in discussions and frequently sparks conversation"
      : engagementScore > 45
        ? "Regularly participates in community discussions"
        : engagementScore > 20
          ? "Selective engager — contributes occasionally but meaningfully"
          : "Mostly lurks or shares links without much discussion",
  });

  // --- Curiosity ---
  // Question ratio + topic diversity + vocabulary breadth
  const topicDiversity = Math.min(1, topics.length / 8); // 8+ topics = max diversity
  const vocabSignal = Math.min(1, writingStyle.vocabulary / 3000); // 3000 unique words = very broad
  const curiosityRaw =
    writingStyle.questionRatio * 1.2 +       // 0-~60: asking questions
    topicDiversity * 25 +                     // 0-25: diverse interests
    vocabSignal * 15;                         // 0-15: broad vocabulary
  const curiosityScore = Math.min(100, Math.round(curiosityRaw));

  traits.push({
    name: "Curiosity",
    score: curiosityScore,
    description: curiosityScore > 70
      ? "Intensely curious — asks probing questions across diverse topics"
      : curiosityScore > 45
        ? "Genuinely curious — explores multiple domains and asks thoughtful questions"
        : curiosityScore > 20
          ? "Focused interests — tends to stay within known domains"
          : "Narrow focus — engages deeply in specific areas rather than exploring widely",
  });

  // --- Content Creation ---
  // Story ratio + karma earned per story + whether they submit OC vs links
  const storyRatio = items.length > 0 ? stories.length / items.length : 0;
  const avgStoryScore = stories.length > 0
    ? stories.reduce((s, st) => s + (st.score || 0), 0) / stories.length
    : 0;
  const selfPosts = stories.filter((s) => !s.url).length;
  const selfPostRatio = stories.length > 0 ? selfPosts / stories.length : 0;

  const creatorRaw =
    storyRatio * 50 +                                         // 0-50: how much they post
    Math.min(25, Math.log2(Math.max(1, avgStoryScore)) * 5) + // 0-25: quality (log scale)
    selfPostRatio * 25;                                        // 0-25: original content
  const creatorScore = Math.min(100, Math.round(creatorRaw));

  traits.push({
    name: "Content Creation",
    score: creatorScore,
    description: creatorScore > 70
      ? "Prolific creator — frequently shares content and original posts"
      : creatorScore > 45
        ? "Active contributor — regularly shares interesting finds and ideas"
        : creatorScore > 20
          ? "Occasional sharer — submits content from time to time"
          : "Primarily a commenter — engages with others' content rather than submitting",
  });

  // --- Verbosity ---
  // Use percentile-based scoring. HN median comment ~150 chars, long is 500+, very long 1000+
  const verbosityRaw = Math.min(100, Math.round(
    (Math.log2(Math.max(1, writingStyle.avgLength)) / Math.log2(1500)) * 100
  ));
  const verbosityScore = Math.max(0, verbosityRaw);

  traits.push({
    name: "Verbosity",
    score: verbosityScore,
    description: verbosityScore > 70
      ? "Writes detailed, thorough responses — doesn't shy from long-form"
      : verbosityScore > 45
        ? "Balanced writer — adapts length to the topic"
        : verbosityScore > 20
          ? "Concise communicator — gets the point across efficiently"
          : "Extremely terse — minimal words, maximum signal",
  });

  // --- Helpfulness ---
  // Links shared, code provided, helpful language, constructive tone
  const helpfulnessRaw =
    writingStyle.linkRatio * 0.8 +
    writingStyle.codeRatio * 1.0 +
    sentiment.helpfulness * 0.6 +
    sentiment.positivity * 0.2;
  const helpfulnessScore = Math.min(100, Math.round(helpfulnessRaw));

  traits.push({
    name: "Helpfulness",
    score: helpfulnessScore,
    description: helpfulnessScore > 70
      ? "Generous helper — frequently provides resources, examples, and constructive advice"
      : helpfulnessScore > 45
        ? "Supportive — often offers practical help and references"
        : helpfulnessScore > 20
          ? "Occasionally helpful — shares links or tips when relevant"
          : "Discussion-oriented — engages in debate rather than providing guidance",
  });

  // --- Contrarian ---
  // Disagreement signals + low positivity + presence in controversial topics
  const contrarianRaw =
    sentiment.disagreement * 0.8 +
    Math.max(0, 30 - sentiment.positivity * 0.3) +
    (writingStyle.exclamationRatio > 20 ? 10 : 0);
  const contrarianScore = Math.min(100, Math.round(contrarianRaw));

  traits.push({
    name: "Contrarian",
    score: contrarianScore,
    description: contrarianScore > 70
      ? "Strong independent thinker — frequently challenges consensus and pushes back"
      : contrarianScore > 45
        ? "Willing to disagree — not afraid to voice an unpopular opinion"
        : contrarianScore > 20
          ? "Generally agreeable — occasionally pushes back when warranted"
          : "Consensus-aligned — tends to build on others' ideas constructively",
  });

  // --- Determine archetype ---
  // Use a scoring system instead of if/else chain
  // Find the dominant trait (highest score) and secondary trait
  const traitScores = {
    technical: technicalScore,
    engagement: engagementScore,
    curiosity: curiosityScore,
    creator: creatorScore,
    verbosity: verbosityScore,
    helpfulness: helpfulnessScore,
    contrarian: contrarianScore,
  };

  // Normalize: compute how much each trait stands out from the user's own average
  const traitValues = Object.values(traitScores);
  const traitMean = traitValues.reduce((a, b) => a + b, 0) / traitValues.length;

  // Each archetype is defined by which traits must be ABOVE the user's own average
  const archetypes: { name: string; description: string; score: number }[] = [
    {
      name: "The Deep Diver",
      description: "A technically-minded individual who goes deep on topics, providing thorough analysis and detailed explanations. Values precision and completeness.",
      score:
        (technicalScore > traitMean ? 25 : 0) +
        (verbosityScore > traitMean ? 15 : 0) +
        technicalScore * 0.25 +
        writingStyle.codeRatio * 3 +
        (technicalScore > 60 ? 10 : 0),
    },
    {
      name: "The Curator",
      description: "A prolific content discoverer who surfaces interesting finds for the community. Has a sharp eye for what matters and what's worth discussing.",
      score:
        (creatorScore > traitMean ? 25 : 0) +
        (creatorScore > engagementScore ? 15 : 0) +
        creatorScore * 0.3 +
        topicDiversity * 15,
    },
    {
      name: "The Socratic",
      description: "An engaged community member who drives discussions through questioning and dialogue. Seeks understanding by probing assumptions.",
      score:
        (curiosityScore > traitMean ? 25 : 0) +
        (engagementScore > traitMean ? 15 : 0) +
        curiosityScore * 0.25 +
        engagementScore * 0.15 +
        (curiosityScore > 50 ? 10 : 0),
    },
    {
      name: "The Mentor",
      description: "An experienced voice who shares knowledge generously. Writes detailed, helpful responses to educate and guide others.",
      score:
        (helpfulnessScore > traitMean ? 25 : 0) +
        (verbosityScore > traitMean ? 15 : 0) +
        helpfulnessScore * 0.25 +
        verbosityScore * 0.15 +
        (engagementScore > 50 ? 10 : 0),
    },
    {
      name: "The Polymath",
      description: "A well-rounded contributor spanning many topics. Brings cross-domain insights and connects ideas across disciplines.",
      score:
        (topicDiversity > 0.6 ? 25 : 0) +
        topicDiversity * 30 +
        (curiosityScore > traitMean ? 10 : 0) +
        (creatorScore > 20 && engagementScore > 20 ? 10 : 0),
    },
    {
      name: "The Pragmatist",
      description: "A no-nonsense mind who communicates efficiently. Values practical solutions, brevity, and real-world applicability over theoretical debate.",
      score:
        (verbosityScore < traitMean ? 25 : 0) +
        (technicalScore > traitMean ? 10 : 0) +
        (100 - verbosityScore) * 0.2 +
        helpfulnessScore * 0.15 +
        writingStyle.codeRatio * 3,
    },
    {
      name: "The Debater",
      description: "A passionate discussant who thrives in intellectual sparring. Challenges ideas, questions assumptions, and doesn't back down from controversial takes.",
      score:
        (contrarianScore > traitMean ? 25 : 0) +
        (engagementScore > traitMean ? 15 : 0) +
        contrarianScore * 0.3 +
        (contrarianScore > 50 ? 10 : 0),
    },
    {
      name: "The Explorer",
      description: "A curious mind constantly seeking new knowledge. Wide-ranging interests paired with genuine intellectual curiosity about how things work.",
      score:
        (curiosityScore > traitMean ? 20 : 0) +
        (topicDiversity > 0.5 ? 15 : 0) +
        curiosityScore * 0.2 +
        topicDiversity * 20 +
        (technicalScore < traitMean ? 10 : 0),
    },
    {
      name: "The Storyteller",
      description: "A narrative-driven communicator who provides context and perspective. Writes longer, more thoughtful pieces that weave together ideas.",
      score:
        (verbosityScore > traitMean ? 25 : 0) +
        (technicalScore < traitMean ? 15 : 0) +
        verbosityScore * 0.2 +
        creatorScore * 0.1 +
        sentiment.positivity * 0.3,
    },
    {
      name: "The Observer",
      description: "A thoughtful, selective participant. When they speak, it's deliberate and considered — quality over quantity.",
      score:
        (engagementScore < traitMean ? 25 : 0) +
        (creatorScore < traitMean ? 15 : 0) +
        (100 - engagementScore) * 0.2 +
        (user.karma / Math.max(items.length, 1) > 50 ? 15 : 0),
    },
  ];

  archetypes.sort((a, b) => b.score - a.score);
  const bestFit = archetypes[0];

  return {
    traits,
    archetype: bestFit.name,
    archetypeDescription: bestFit.description,
  };
}

// Build a full monthly timeline from earliest item to latest, filling gaps with 0
function buildTimeline(items: HNItem[]): { month: string; count: number }[] {
  if (items.length === 0) return [];

  const monthCounts: Record<string, number> = {};
  for (const item of items) {
    const date = new Date(item.time * 1000);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    monthCounts[key] = (monthCounts[key] || 0) + 1;
  }

  // Find min and max months
  const timestamps = items.map((i) => i.time);
  const minDate = new Date(Math.min(...timestamps) * 1000);
  const maxDate = new Date(Math.max(...timestamps) * 1000);

  // Generate all months between min and max
  const timeline: { month: string; count: number }[] = [];
  const cursor = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
  const end = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);

  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    timeline.push({ month: key, count: monthCounts[key] || 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  // If too many months, show last 36
  return timeline.slice(-36);
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

  // Activity timeline — fill gaps between first and last item
  const activityTimeline = buildTimeline(items);

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

  const personality = analyzePersonality(items, stories, comments, writingStyle, topics, user);

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
