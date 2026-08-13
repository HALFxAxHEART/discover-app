import { env } from "./env";

export type LibrarySeries = {
  id: number;
  name: string;
  libraryId: number;
  pagesRead: number;
  pages: number;
  lastChapterAdded: string;
};

async function login(): Promise<{ token: string; apiKey: string }> {
  const response = await fetch(`${env.kavitaUrl}/api/Account/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: env.kavitaUsername, password: env.kavitaPassword }),
  });
  if (!response.ok) throw new Error(`Kavita login failed: ${response.status}`);
  return (await response.json()) as { token: string; apiKey: string };
}

export async function listSeriesByRecentlyUpdated(): Promise<LibrarySeries[]> {
  const { token } = await login();
  const response = await fetch(`${env.kavitaUrl}/api/Series/v2?PageNumber=1&PageSize=500`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      statements: [],
      combination: 0,
      sortOptions: { sortField: 4, isAscending: false }, // 4 = LastChapterAdded
      limitTo: 0,
    }),
  });
  if (!response.ok) throw new Error(`Kavita series list failed: ${response.status}`);
  return (await response.json()) as LibrarySeries[];
}

export async function fetchSeriesCover(seriesId: number): Promise<Response> {
  const { apiKey } = await login();
  return fetch(`${env.kavitaUrl}/api/image/series-cover?seriesId=${seriesId}&apiKey=${apiKey}`);
}
