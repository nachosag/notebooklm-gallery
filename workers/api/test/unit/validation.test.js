import { describe, it, expect } from "vitest";
import { validateNotebook } from "../../src/utils/validation.js";

const VALID_DATA = {
  title: "My Test Notebook",
  description: "A detailed description that is long enough to pass validation",
  share_url: "https://notebooklm.google.com/notebook/abc123",
  categories: ["education"],
};

describe("validateNotebook", () => {
  describe("valid data", () => {
    it("returns valid for complete valid data", () => {
      const result = validateNotebook(VALID_DATA);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeNull();
    });

    it("returns valid with optional tags", () => {
      const result = validateNotebook({
        ...VALID_DATA,
        tags: ["ai", "productivity"],
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toBeNull();
    });
  });

  describe("title", () => {
    it("rejects title shorter than 3 chars", () => {
      const result = validateNotebook({ ...VALID_DATA, title: "ab" });
      expect(result.valid).toBe(false);
      expect(result.errors.title).toBeDefined();
    });

    it("accepts title at exact minimum (3 chars)", () => {
      const result = validateNotebook({ ...VALID_DATA, title: "abc" });
      expect(result.valid).toBe(true);
    });

    it("accepts title at exact maximum (120 chars)", () => {
      const result = validateNotebook({
        ...VALID_DATA,
        title: "a".repeat(120),
      });
      expect(result.valid).toBe(true);
    });

    it("rejects title longer than 120 chars", () => {
      const result = validateNotebook({
        ...VALID_DATA,
        title: "a".repeat(121),
      });
      expect(result.valid).toBe(false);
      expect(result.errors.title).toBeDefined();
    });

    it("rejects empty title", () => {
      const result = validateNotebook({ ...VALID_DATA, title: "" });
      expect(result.valid).toBe(false);
      expect(result.errors.title).toBeDefined();
    });

    it("rejects missing title", () => {
      const { title, ...dataWithoutTitle } = VALID_DATA;
      const result = validateNotebook(dataWithoutTitle);
      expect(result.valid).toBe(false);
      expect(result.errors.title).toBeDefined();
    });
  });

  describe("description", () => {
    it("rejects description shorter than 20 chars", () => {
      const result = validateNotebook({
        ...VALID_DATA,
        description: "short",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.description).toBeDefined();
    });

    it("accepts description at exact minimum (20 chars)", () => {
      const result = validateNotebook({
        ...VALID_DATA,
        description: "a".repeat(20),
      });
      expect(result.valid).toBe(true);
    });

    it("accepts description at exact maximum (1000 chars)", () => {
      const result = validateNotebook({
        ...VALID_DATA,
        description: "a".repeat(1000),
      });
      expect(result.valid).toBe(true);
    });

    it("rejects description longer than 1000 chars", () => {
      const result = validateNotebook({
        ...VALID_DATA,
        description: "a".repeat(1001),
      });
      expect(result.valid).toBe(false);
      expect(result.errors.description).toBeDefined();
    });

    it("rejects empty description", () => {
      const result = validateNotebook({ ...VALID_DATA, description: "" });
      expect(result.valid).toBe(false);
      expect(result.errors.description).toBeDefined();
    });

    it("rejects missing description", () => {
      const { description, ...data } = VALID_DATA;
      const result = validateNotebook(data);
      expect(result.valid).toBe(false);
      expect(result.errors.description).toBeDefined();
    });
  });

  describe("share_url", () => {
    it("rejects http protocol", () => {
      const result = validateNotebook({
        ...VALID_DATA,
        share_url: "http://notebooklm.google.com/notebook/abc",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.share_url).toBeDefined();
    });

    it("rejects non-notebooklm hostname", () => {
      const result = validateNotebook({
        ...VALID_DATA,
        share_url: "https://example.com/notebook/abc",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.share_url).toBeDefined();
    });

    it("rejects invalid URL format", () => {
      const result = validateNotebook({
        ...VALID_DATA,
        share_url: "not-a-url",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.share_url).toBeDefined();
    });

    it("rejects empty share_url", () => {
      const result = validateNotebook({ ...VALID_DATA, share_url: "" });
      expect(result.valid).toBe(false);
      expect(result.errors.share_url).toBeDefined();
    });

    it("rejects missing share_url", () => {
      const { share_url, ...data } = VALID_DATA;
      const result = validateNotebook(data);
      expect(result.valid).toBe(false);
      expect(result.errors.share_url).toBeDefined();
    });

    it("accepts valid notebooklm URL", () => {
      const result = validateNotebook({
        ...VALID_DATA,
        share_url: "https://notebooklm.google.com/notebook/abc123",
      });
      expect(result.valid).toBe(true);
    });
  });

  describe("categories", () => {
    it("accepts empty array (0 categories allowed)", () => {
      const result = validateNotebook({ ...VALID_DATA, categories: [] });
      expect(result.valid).toBe(true);
      expect(result.errors).toBeNull();
    });

    it("accepts absent categories (optional field)", () => {
      const { categories, ...data } = VALID_DATA;
      const result = validateNotebook(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeNull();
    });

    it("rejects more than 3 categories", () => {
      const result = validateNotebook({
        ...VALID_DATA,
        categories: ["education", "technology", "research", "creative"],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.categories).toBeDefined();
    });

    it("rejects invalid category string", () => {
      const result = validateNotebook({
        ...VALID_DATA,
        categories: ["invalid_category"],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.categories).toBeDefined();
    });

    it("rejects non-array value", () => {
      const result = validateNotebook({
        ...VALID_DATA,
        categories: "education",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.categories).toBeDefined();
    });

    it("accepts missing categories (optional field, lenient)", () => {
      const { categories, ...data } = VALID_DATA;
      const result = validateNotebook(data);
      expect(result.valid).toBe(true);
      expect(result.errors).toBeNull();
    });

    it("accepts exactly 1 category", () => {
      const result = validateNotebook({
        ...VALID_DATA,
        categories: ["education"],
      });
      expect(result.valid).toBe(true);
    });

    it("accepts exactly 3 categories", () => {
      const result = validateNotebook({
        ...VALID_DATA,
        categories: ["education", "technology", "research"],
      });
      expect(result.valid).toBe(true);
    });
  });

  describe("tags", () => {
    it("rejects more than 10 tags", () => {
      const result = validateNotebook({
        ...VALID_DATA,
        tags: Array.from({ length: 11 }, (_, i) => `tag${i}`),
      });
      expect(result.valid).toBe(false);
      expect(result.errors.tags).toBeDefined();
    });

    it("rejects tag shorter than 2 chars", () => {
      const result = validateNotebook({
        ...VALID_DATA,
        tags: ["a"],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.tags).toBeDefined();
    });

    it("rejects tag longer than 30 chars", () => {
      const result = validateNotebook({
        ...VALID_DATA,
        tags: ["a".repeat(31)],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.tags).toBeDefined();
    });

    it("rejects non-array tags", () => {
      const result = validateNotebook({
        ...VALID_DATA,
        tags: "not-an-array",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.tags).toBeDefined();
    });

    it("accepts valid tags", () => {
      const result = validateNotebook({
        ...VALID_DATA,
        tags: ["ai", "productivity", "learning"],
      });
      expect(result.valid).toBe(true);
    });

    it("accepts exactly 10 tags", () => {
      const result = validateNotebook({
        ...VALID_DATA,
        tags: Array.from({ length: 10 }, (_, i) => `tag${i}`),
      });
      expect(result.valid).toBe(true);
    });

    it("accepts tag at exact minimum (2 chars)", () => {
      const result = validateNotebook({
        ...VALID_DATA,
        tags: ["ab"],
      });
      expect(result.valid).toBe(true);
    });

    it("accepts tag at exact maximum (30 chars)", () => {
      const result = validateNotebook({
        ...VALID_DATA,
        tags: ["a".repeat(30)],
      });
      expect(result.valid).toBe(true);
    });

    it("allows missing tags (optional field)", () => {
      const { tags, ...data } = VALID_DATA;
      const result = validateNotebook(data);
      expect(result.valid).toBe(true);
    });
  });
});
