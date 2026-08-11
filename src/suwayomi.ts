import { env } from "./env";

const SOURCES: { id: string; name: string }[] = [
  { id: "6247824327199706550", name: "Asura Scans" },
  { id: "2522335540328470744", name: "Webtoons.com" },
];

function authHeader(): string {
  const auth = Buffer.from(`${env.suwayomiUsername}:${env.suwayomiPassword}`).toString("base64");
  return `Basic ${auth}`;
}

async function graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${env.suwayomiUrl}/api/graphql`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader() },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error(`Suwayomi request failed: ${response.status} ${await response.text()}`);
  const body = (await response.json()) as { data?: T; errors?: { message: string }[] };
  if (body.errors?.length) throw new Error(`Suwayomi GraphQL error: ${body.errors.map((e) => e.message).join("; ")}`);
  if (!body.data) throw new Error("Suwayomi GraphQL response missing data");
  return body.data;
}

export type SearchResult = {
  id: number;
  title: string;
  sourceName: string;
  inLibrary: boolean;
};

const SEARCH_QUERY = `
  mutation Search($source: LongString!, $query: String!) {
    fetchSourceManga(input: { source: $source, type: SEARCH, query: $query, page: 1, filters: [] }) {
      mangas { id title inLibrary }
    }
  }
`;

export async function searchAllSources(query: string): Promise<SearchResult[]> {
  const results = await Promise.allSettled(
    SOURCES.map(async (source) => {
      const data = await graphql<{ fetchSourceManga: { mangas: { id: number; title: string; inLibrary: boolean }[] } }>(
        SEARCH_QUERY,
        { source: source.id, query },
      );
      return data.fetchSourceManga.mangas.map((m) => ({ ...m, sourceName: source.name }));
    }),
  );

  results.forEach((r, i) => {
    if (r.status === "rejected") console.error(`Search failed for source ${SOURCES[i].name}:`, r.reason);
  });

  return results.filter((r) => r.status === "fulfilled").flatMap((r) => (r as PromiseFulfilledResult<SearchResult[]>).value);
}

const ADD_TO_LIBRARY_MUTATION = `
  mutation AddToLibrary($id: Int!) {
    updateManga(input: { id: $id, patch: { inLibrary: true } }) { manga { id } }
  }
`;

const FETCH_CHAPTERS_MUTATION = `
  mutation FetchChapters($mangaId: Int!) {
    fetchChapters(input: { mangaId: $mangaId }) { chapters { id } }
  }
`;

const ENQUEUE_DOWNLOADS_MUTATION = `
  mutation Enqueue($ids: [Int!]!) {
    enqueueChapterDownloads(input: { ids: $ids }) { clientMutationId }
  }
`;

const START_DOWNLOADER_MUTATION = `
  mutation Start {
    startDownloader(input: {}) { downloadStatus { state } }
  }
`;

export async function addMangaAndDownload(mangaId: number): Promise<{ chapterCount: number }> {
  await graphql(ADD_TO_LIBRARY_MUTATION, { id: mangaId });
  const chaptersData = await graphql<{ fetchChapters: { chapters: { id: number }[] } }>(FETCH_CHAPTERS_MUTATION, { mangaId });
  const chapterIds = chaptersData.fetchChapters.chapters.map((c) => c.id);

  if (chapterIds.length > 0) {
    await graphql(ENQUEUE_DOWNLOADS_MUTATION, { ids: chapterIds });
    await graphql(START_DOWNLOADER_MUTATION, {});
  }

  return { chapterCount: chapterIds.length };
}

export async function fetchThumbnail(mangaId: number): Promise<Response> {
  return fetch(`${env.suwayomiUrl}/api/v1/manga/${mangaId}/thumbnail`, {
    headers: { Authorization: authHeader() },
  });
}
