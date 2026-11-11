import { describe, expect, it } from "vitest";
import { parseArticleFile, serializeArticle } from "@/lib/editor-content";

const fixture = [
  "---",
  'slug: "heap-house"',
  'title: "Heap House"',
  'competition: "Sample CTF"',
  'category: "Pwn"',
  'difficulty: "Medium"',
  'date: "2026-10-01"',
  'updated: "2026-10-02"',
  'summary: "A heap challenge."',
  'tags: ["heap", "glibc"]',
  'status: "published"',
  'flag: null',
  'attachments: [{"url":"/assets/uploads/proof.pdf","name":"proof.pdf","contentType":"application/pdf"}]',
  "---",
  "",
  "# Heap House",
  "",
  "A writeup body.",
].join("\n");

describe("file-backed article parsing", () => {
  it("parses JSON-style frontmatter and Markdown body", () => {
    const article = parseArticleFile(fixture, "heap-house.md");
    expect(article.slug).toBe("heap-house");
    expect(article.title).toBe("Heap House");
    expect(article.tags).toEqual(["heap", "glibc"]);
    expect(article.status).toBe("published");
    expect(article.attachments[0]?.url).toBe("/assets/uploads/proof.pdf");
    expect(article.content).toContain("# Heap House");
  });

  it("defaults missing publication status to draft", () => {
    const draft = fixture.replace('status: "published"\n', "");
    expect(parseArticleFile(draft, "heap-house.md").status).toBe("draft");
  });

  it("rejects a filename and slug mismatch", () => {
    expect(() => parseArticleFile(fixture, "different-slug.md")).toThrow(/does not match/);
  });

  it("rejects missing frontmatter", () => {
    expect(() => parseArticleFile("# no metadata", "no-metadata.md")).toThrow(/missing frontmatter/);
  });

  it("serializes and parses a round-trip without losing article content or metadata", () => {
    const parsed = parseArticleFile(fixture, "heap-house.md");
    const serialized = serializeArticle(parsed);
    const next = parseArticleFile(serialized, "heap-house.md");
    expect(next).toMatchObject({
      slug: parsed.slug,
      title: parsed.title,
      competition: parsed.competition,
      category: parsed.category,
      date: parsed.date,
      status: parsed.status,
      tags: parsed.tags,
      attachments: parsed.attachments,
      content: parsed.content,
    });
  });
});
