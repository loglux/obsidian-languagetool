import { describe, expect, test } from "bun:test";
import { SyntaxTree } from "../markdown/parser";
import { readdirSync, readFileSync } from "node:fs";

describe("markdown parsing", () => {
    test("hello world", () => {
        let input = "Hello world";
        let syntax = new SyntaxTree(input);
        let { offset, annotations } = syntax.annotate(undefined);
        expect(annotations.length()).toBe(input.length);
        expect(annotations.annotations[0]).toStrictEqual({ text: input });
    });

    test("wiki link", () => {
        let input = "Hello [[World]]!";
        let syntax = new SyntaxTree(input);
        let { offset, annotations } = syntax.annotate(undefined);
        expect(annotations.length()).toBe(input.length);
        expect(annotations.annotations[0]).toStrictEqual({ text: "Hello " });
        expect(annotations.annotations[1]).toStrictEqual({ markup: "  ", interpretAs: undefined });
        expect(annotations.annotations[2]).toStrictEqual({ text: "World" });
        expect(annotations.annotations[3]).toStrictEqual({ markup: "  ", interpretAs: undefined });
        expect(annotations.annotations[4]).toStrictEqual({ text: "!" });

        expect(syntax.isInside(9, "wikiLink")).toBeTrue();
        expect(!syntax.isInside(3, "wikiLink")).toBeTrue();
    });

    test("wiki link with alias", () => {
        let input = "Hello [[World|alias]]!";
        let syntax = new SyntaxTree(input);
        let { offset, annotations } = syntax.annotate(undefined);
        expect(annotations.length()).toBe(input.length);
        expect(annotations.annotations[0]).toStrictEqual({ text: "Hello " });
        expect(annotations.annotations[1]).toStrictEqual({
            markup: "        ",
            interpretAs: undefined,
        });
        expect(annotations.annotations[2]).toStrictEqual({ text: "alias" });
        expect(annotations.annotations[3]).toStrictEqual({ markup: "  ", interpretAs: undefined });
        expect(annotations.annotations[4]).toStrictEqual({ text: "!" });
    });

    test("len error", () => {
        let input = `
- EML attached
    - Here are some examples:
      Just padding text
      [[Here is some link]]
`;
        let syntax = new SyntaxTree(input);
        let { offset, annotations } = syntax.annotate(undefined);
        expect(annotations.length()).toBe(input.trimEnd().length);
    });

    test("simple escape", () => {
        let input = `Hello \\\\world`;
        let syntax = new SyntaxTree(input);
        let { offset, annotations } = syntax.annotate(undefined);
        expect(annotations.length()).toBe(input.length);
        expect(annotations.annotations[0]).toStrictEqual({ text: "Hello " });
        expect(annotations.annotations[1]).toStrictEqual({ markup: " ", interpretAs: "" });
        expect(annotations.annotations[2]).toStrictEqual({ text: "\\" });
        expect(annotations.annotations[3]).toStrictEqual({ text: "world" });
    });

    test("soft break with trailing whitespace keeps next line intact", () => {
        // mdast strips trailing whitespace from each line of a soft-broken
        // paragraph. addLines must not interpret that length diff as a
        // leading indent, otherwise it would drop the first character of
        // the next line — observed in the wild as "We" becoming "e",
        // "However" becoming "owever", etc. (see #22).
        let input = "First sentence. \nWe realised that.";
        let syntax = new SyntaxTree(input);
        let { annotations } = syntax.annotate(undefined);
        let logical = annotations.annotations
            .map(a => "text" in a ? a.text : (a.interpretAs ?? ""))
            .join("");
        expect(logical).toContain("We realised");
        expect(logical).not.toContain("\ne realised");
    });

    test("many escapes", () => {
        let input = `\\!\\"\\#\\$\\%\\&\\'\\(\\)\\*\\+\\,\\-\\.\\/\\:\\;\\<\\=\\>\\?\\@\\[\\\\\\]\\^\\_\\\`\\{\\|\\}\\~`;
        let syntax = new SyntaxTree(input);
        let { offset, annotations } = syntax.annotate(undefined);
        expect(annotations.length()).toBe(input.length);
        for (let i = 0; i < input.length; i += 2) {
            expect(annotations.annotations[i]).toStrictEqual({ markup: " ", interpretAs: "" });
            expect(annotations.annotations[i + 1]).toStrictEqual({ text: input[i + 1] });
        }
        // ...
    });
});

describe("markdown samples", () => {
    // iterate over all files in the samples directory
    const files = readdirSync("test");
    for (const file of files) {
        test(`sample ${file}`, () => {
            const input = readFileSync(`test/${file}`, "utf-8");
            let syntax = new SyntaxTree(input);
            let { offset, annotations } = syntax.annotate(undefined);
            expect(annotations.length()).toBe(input.trimEnd().length);
        });
    }
});
