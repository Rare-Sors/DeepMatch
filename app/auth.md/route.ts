import { renderAuthMarkdown } from "@/lib/agent-documents";

export async function GET(request: Request) {
  const body = await renderAuthMarkdown(new URL(request.url).origin);

  return new Response(body, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
