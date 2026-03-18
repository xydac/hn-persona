const HN_API = "https://hacker-news.firebaseio.com/v0";

export interface HNUser {
  id: string;
  about?: string;
  created: number;
  karma: number;
  submitted?: number[];
}

export interface HNItem {
  id: number;
  type: "story" | "comment" | "job" | "poll" | "pollopt";
  by?: string;
  time: number;
  text?: string;
  title?: string;
  url?: string;
  score?: number;
  descendants?: number;
  kids?: number[];
  parent?: number;
  dead?: boolean;
  deleted?: boolean;
}

export async function fetchUser(username: string): Promise<HNUser | null> {
  const res = await fetch(`${HN_API}/user/${encodeURIComponent(username)}.json`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data || null;
}

export async function fetchItem(id: number): Promise<HNItem | null> {
  try {
    const res = await fetch(`${HN_API}/item/${id}.json`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchItems(ids: number[], maxConcurrent = 30): Promise<HNItem[]> {
  const items: HNItem[] = [];
  for (let i = 0; i < ids.length; i += maxConcurrent) {
    const batch = ids.slice(i, i + maxConcurrent);
    const results = await Promise.all(batch.map(fetchItem));
    for (const item of results) {
      if (item && !item.deleted && !item.dead) {
        items.push(item);
      }
    }
  }
  return items;
}
