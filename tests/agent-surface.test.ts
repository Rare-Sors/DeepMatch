import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  renderAuthMarkdown,
  renderSkillMarkdown,
} from "../lib/agent-documents.ts";
import {
  buildAgentSurfaceUrls,
} from "../lib/agent-surface.ts";

test("buildAgentSurfaceUrls returns canonical agent docs and Rare paths", () => {
  assert.deepEqual(buildAgentSurfaceUrls("https://deepmatch.example"), {
    skillUrl: "https://deepmatch.example/skill.md",
    authUrl: "https://deepmatch.example/auth.md",
    rarePlatformUrl: "https://deepmatch.example/api/rare",
  });
});

test("renderAuthMarkdown reuses repo auth.md and appends runtime values", async () => {
  const baseDoc = (await readFile("auth.md", "utf8")).trimEnd();
  const markdown = await renderAuthMarkdown("https://deepmatch.example");

  assert.match(markdown, /# DeepMatch Auth/);
  assert.match(markdown, /## Runtime Values/);
  assert.match(markdown, /rare --platform-url .* login --aud /);
  assert.match(markdown, /https:\/\/deepmatch\.example\/api\/rare/);
  assert.equal(markdown.startsWith(baseDoc), true);
});

test("renderSkillMarkdown reuses repo skill.md and appends runtime links", async () => {
  const baseDoc = (await readFile("skill.md", "utf8")).trimEnd();
  const markdown = await renderSkillMarkdown("https://deepmatch.example");

  assert.match(markdown, /# DeepMatch Founder Matching Skill/);
  assert.match(markdown, /## Runtime Links/);
  assert.match(markdown, /Inbox first/);
  assert.match(markdown, /https:\/\/deepmatch\.example\/auth\.md/);
  assert.equal(markdown.startsWith(baseDoc), true);
});
