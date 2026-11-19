import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { bookLanguages, books, filterBooks, libraryFaculties } from "../modules/campus/books.ts";

const ids = (matches) => matches.map(({ id }) => id);

test("every faculty and every book language has a distinct, populated collection", () => {
  assert.equal(filterBooks().length, books.length);
  assert.equal(new Set(ids(books)).size, books.length);
  const collections = new Set();
  for (const faculty of libraryFaculties) {
    const matches = filterBooks({ faculty });
    assert.ok(matches.length > 0, faculty);
    assert.ok(matches.every(({ faculties }) => faculties.includes(faculty)), faculty);
    collections.add(ids(matches).join(","));
  }
  assert.equal(collections.size, libraryFaculties.length);
  for (const language of bookLanguages) {
    const matches = filterBooks({ language });
    assert.ok(matches.length > 0, language);
    assert.ok(matches.every((book) => book.language === language), language);
  }
});

test("search matches Armenian and Cyrillic, folds French accents, and combines filters", () => {
  assert.deepEqual(ids(filterBooks({ query: "ԳԻՔՈՐԸ", language: "hy" })), ["hy-giqor"]);
  assert.deepEqual(ids(filterBooks({ query: "шИНель", language: "ru" })), ["ru-overcoat"]);
  assert.deepEqual(ids(filterBooks({ query: "  exo7 algebre ", faculty: "informatics", language: "fr", category: "mathematics" })), ["exo7-algebre"]);
  assert.deepEqual(filterBooks({ query: "algebre", faculty: "law", language: "fr" }), []);
});

test("download links name real EPUB assets in all four languages", async () => {
  const assets = new URL("../public/library-books/", import.meta.url);
  const hosted = books.filter(({ download }) => download?.hosted);
  const names = hosted.map(({ download }) => download.url.split("/").at(-1));
  assert.deepEqual([...new Set(hosted.map(({ language }) => language))].sort(), [...bookLanguages].sort());
  assert.deepEqual(names.sort(), (await readdir(assets)).sort());
  for (const name of names) {
    const file = await readFile(new URL(name, assets));
    assert.equal(file.subarray(0, 4).toString("hex"), "504b0304", name);
    assert.ok(file.subarray(0, 75).includes("application/epub+zip"), name);
  }
});
