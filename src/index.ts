import { env } from "./env";
import { searchAllSources, addMangaAndDownload, fetchThumbnail } from "./suwayomi";
import { listSeriesByRecentlyUpdated, fetchSeriesCover } from "./kavita";

const publicDir = new URL("../public", import.meta.url).pathname;

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

Bun.serve({
  port: env.port,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    // --- /discover: search Suwayomi's sources, add new series ---

    if (path === "/discover/api/search" && req.method === "GET") {
      const q = url.searchParams.get("q") ?? "";
      if (!q.trim()) return Response.json({ results: [] });
      try {
        const results = await searchAllSources(q);
        return Response.json({ results });
      } catch (err) {
        console.error(err);
        return Response.json({ error: "search failed" }, { status: 502 });
      }
    }

    if (path === "/discover/api/add" && req.method === "POST") {
      try {
        const body = (await req.json()) as { mangaId: number };
        const result = await addMangaAndDownload(body.mangaId);
        return Response.json(result);
      } catch (err) {
        console.error(err);
        return Response.json({ error: "add failed" }, { status: 502 });
      }
    }

    const thumbMatch = path.match(/^\/discover\/api\/thumbnail\/(\d+)$/);
    if (thumbMatch) {
      const mangaId = Number(thumbMatch[1]);
      const upstream = await fetchThumbnail(mangaId);
      return new Response(upstream.body, {
        status: upstream.status,
        headers: { "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg" },
      });
    }

    // --- /grid: existing library, sorted by most recently updated ---

    if (path === "/grid/api/library" && req.method === "GET") {
      try {
        const series = await listSeriesByRecentlyUpdated();
        return Response.json({
          series: series.map((s) => ({
            id: s.id,
            name: s.name,
            libraryId: s.libraryId,
            lastChapterAddedRelative: relativeTime(s.lastChapterAdded),
          })),
        });
      } catch (err) {
        console.error(err);
        return Response.json({ error: "library fetch failed" }, { status: 502 });
      }
    }

    const coverMatch = path.match(/^\/grid\/api\/cover\/(\d+)$/);
    if (coverMatch) {
      const seriesId = Number(coverMatch[1]);
      const upstream = await fetchSeriesCover(seriesId);
      return new Response(upstream.body, {
        status: upstream.status,
        headers: { "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg" },
      });
    }

    // --- Static files for both pages ---

    let filePath: string | null = null;
    if (path === "/discover" || path === "/discover/") filePath = "/index.html";
    else if (path === "/grid" || path === "/grid/") filePath = "/grid.html";
    else if (path === "/discover/favicon.ico" || path === "/grid/favicon.ico") filePath = "/favicon.ico";

    if (filePath) {
      const file = Bun.file(`${publicDir}${filePath}`);
      if (await file.exists()) return new Response(file);
    }

    return new Response("Not found", { status: 404 });
  },
});

console.log(`discover-app listening on :${env.port}`);
