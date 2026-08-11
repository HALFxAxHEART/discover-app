import { env } from "./env";
import { searchAllSources, addMangaAndDownload, fetchThumbnail } from "./suwayomi";

const publicDir = new URL("../public", import.meta.url).pathname;

Bun.serve({
  port: env.port,
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/api/search" && req.method === "GET") {
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

    if (url.pathname === "/api/add" && req.method === "POST") {
      try {
        const body = (await req.json()) as { mangaId: number };
        const result = await addMangaAndDownload(body.mangaId);
        return Response.json(result);
      } catch (err) {
        console.error(err);
        return Response.json({ error: "add failed" }, { status: 502 });
      }
    }

    const thumbMatch = url.pathname.match(/^\/api\/thumbnail\/(\d+)$/);
    if (thumbMatch) {
      const mangaId = Number(thumbMatch[1]);
      const upstream = await fetchThumbnail(mangaId);
      return new Response(upstream.body, {
        status: upstream.status,
        headers: { "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg" },
      });
    }

    // Static file serving for the frontend
    let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
    const file = Bun.file(`${publicDir}${filePath}`);
    if (await file.exists()) return new Response(file);

    return new Response("Not found", { status: 404 });
  },
});

console.log(`discover-app listening on :${env.port}`);
