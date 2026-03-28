import { readFile } from "node:fs/promises";
import path from "node:path";

export async function GET() {
  const skillPath = path.join(process.cwd(), "skill.md");
  const body = await readFile(skillPath, "utf8");

  return new Response(body, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=60",
    },
  });
}
