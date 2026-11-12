import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import ts from "typescript";
import { accountCopy, dashboardCopy } from "../lib/foundation/copy.ts";

test("both foundation dictionaries have the same nonempty keys", () => {
  for (const dictionary of [dashboardCopy, accountCopy]) {
    assert.deepEqual(Object.keys(dictionary.hy).sort(), Object.keys(dictionary.en).sort());
    for (const value of Object.values(dictionary).flatMap(Object.values)) assert.ok(value.trim());
  }
});

test("foundation dashboard and landing contain no hard-coded UI text", () => {
  for (const path of ["app/dashboard/dashboard.tsx", "app/[locale]/page.tsx"]) {
    const source = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function check(node) {
      if (ts.isJsxText(node) && node.text.trim()) {
        const parent = node.parent;
        const hasLanguage = ts.isJsxElement(parent) && parent.openingElement.attributes.properties.some(
          (attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === "lang",
        );
        assert.ok(hasLanguage, `${path}: localize "${node.text.trim()}"`);
      }
      if (ts.isJsxAttribute(node) && ["aria-label", "placeholder", "title"].includes(node.name.getText(source))) {
        assert.ok(!node.initializer || !ts.isStringLiteral(node.initializer), `${path}: localize ${node.name.getText(source)}`);
      }
      ts.forEachChild(node, check);
    }
    check(source);
  }
});
