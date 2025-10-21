export type LeaderboardEntry = {
  name: string;
  score: number;
  date: string; // ISO
};

const KEY = "puzzle_bucket_leaderboard";

export const getLeaderboard = (): LeaderboardEntry[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as LeaderboardEntry[];
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((e) => typeof e?.name === "string" && typeof e?.score === "number" && typeof e?.date === "string")
      .sort((a, b) => b.score - a.score)
      .slice(0, 100);
  } catch {
    return [];
  }
};

export const addLeaderboardEntry = (entry: LeaderboardEntry) => {
  const list = getLeaderboard();
  list.push(entry);
  const sorted = list.sort((a, b) => b.score - a.score).slice(0, 100);
  localStorage.setItem(KEY, JSON.stringify(sorted));
};

