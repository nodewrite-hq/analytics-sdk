import { describe, expect, it } from "vitest";
import { PAGE_LIST_SIZE, pageList, sectionOf } from "./page-list.js";

describe("sectionOf", () => {
  it("takes the first segment, or two after a locale prefix", () => {
    expect(sectionOf("/", ["en"])).toBe("/");
    expect(sectionOf("/news/olive-harvest", ["en"])).toBe("/news");
    expect(sectionOf("/en/news/olive-harvest", ["en"])).toBe("/en/news");
    expect(sectionOf("/en", ["en"])).toBe("/en");
    expect(sectionOf("/en/news", [])).toBe("/en");
  });
});

describe("pageList", () => {
  const pages = Array.from({ length: 60 }, (_, index) => ({ path: `/news/post-${index + 1}`, views: 60 - index }));
  const input = { pages, showAll: true, section: null, search: null, page: 1, localePrefixes: [] };

  it("pages through the full list", () => {
    const second = pageList({ ...input, page: 2 });

    expect(second.rows).toHaveLength(PAGE_LIST_SIZE);
    expect(second.rows[0]?.path).toBe("/news/post-26");
    expect(second.position).toEqual({ page: 2, pageCount: 3, from: 26, to: 50, total: 60 });
  });

  it("keeps a page past the end on the last page", () => {
    expect(pageList({ ...input, page: 9 }).position).toMatchObject({ page: 3, from: 51, to: 60 });
  });

  it("reports an empty match as zero rows on page one", () => {
    expect(pageList({ ...input, search: "recipe" }).position).toEqual({
      page: 1,
      pageCount: 1,
      from: 0,
      to: 0,
      total: 0,
    });
  });

  it("shows only the top pages until the full list is asked for", () => {
    const top = pageList({ ...input, showAll: false });

    expect(top.rows.map((row) => row.path)).toEqual(pages.slice(0, 5).map((row) => row.path));
    expect(top.hasMore).toBe(true);
    expect(top.position).toBeNull();
  });
});
