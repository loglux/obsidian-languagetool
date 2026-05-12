import { describe, expect, test } from "@jest/globals";
import { SyntaxTree } from "../markdown/parser";
import { readdirSync, readFileSync } from "node:fs";

function parse(text: string) {
    return new SyntaxTree(text).annotate(undefined);
}

describe("markdown parsing", () => {
    test("hello world", () => {
        const input = "Hello world";
        const { annotations } = parse(input);
        expect(annotations.length()).toBe(input.length);
        expect(annotations.annotations[0]).toStrictEqual({ text: input });
    });

    test("wiki link", () => {
        const input = "Hello [[World]]!";
        const { annotations } = parse(input);
        expect(annotations.length()).toBe(input.length);
        expect(annotations.annotations[0]).toStrictEqual({ text: "Hello " });
        expect(annotations.annotations[1]).toStrictEqual({ markup: "  ", interpretAs: undefined });
        expect(annotations.annotations[2]).toStrictEqual({ text: "World" });
        expect(annotations.annotations[3]).toStrictEqual({ markup: "  ", interpretAs: undefined });
        expect(annotations.annotations[4]).toStrictEqual({ text: "!" });
    });

    test("wiki link with alias", () => {
        const input = "Hello [[World|alias]]!";
        const { annotations } = parse(input);
        console.info("annotations", annotations.annotations);
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
        const input = `
- EML attached
    - Here are some examples:
      Just padding text
      [[Here is some link]]
`;
        const { offset, annotations } = parse(input);
        console.info("Offset", offset);
        console.info("Annotations", annotations.annotations);
        expect(annotations.length()).toBe(input.trimEnd().length);
    });

    test("simple escape", () => {
        const input = `Hello \\\\world`;
        const { offset, annotations } = parse(input);
        console.info("Offset", offset);
        console.info("Annotations", annotations.annotations);
        expect(annotations.length()).toBe(input.length);
        expect(annotations.annotations[0]).toStrictEqual({ text: "Hello " });
        expect(annotations.annotations[1]).toStrictEqual({ markup: " ", interpretAs: "" });
        expect(annotations.annotations[2]).toStrictEqual({ text: "\\" });
        expect(annotations.annotations[3]).toStrictEqual({ text: "world" });
    });

    test("many escapes", () => {
        const input = `\\!\\"\\#\\$\\%\\&\\'\\(\\)\\*\\+\\,\\-\\.\\/\\:\\;\\<\\=\\>\\?\\@\\[\\\\\\]\\^\\_\\\`\\{\\|\\}\\~`;
        const { offset, annotations } = parse(input);
        console.info("Offset", offset);
        console.info("Annotations", annotations.annotations);
        expect(annotations.length()).toBe(input.length);
        for (let i = 0; i < input.length; i += 2) {
            expect(annotations.annotations[i]).toStrictEqual({ markup: " ", interpretAs: "" });
            expect(annotations.annotations[i + 1]).toStrictEqual({ text: input[i + 1] });
        }
        // ...
    });
});

describe("isInside", () => {
    test("detects table position", () => {
        const tree = new SyntaxTree("text before\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\ntext after");
        // inside the table row
        expect(tree.isInside(20, "table")).toBe(true);
        // before the table
        expect(tree.isInside(2, "table")).toBe(false);
        // after the table
        expect(tree.isInside(50, "table")).toBe(false);
    });

    test("nested node lookup", () => {
        const tree = new SyntaxTree("Hello `code` world");
        // inside the inlineCode
        expect(tree.isInside(8, "inlineCode")).toBe(true);
        expect(tree.isInside(2, "inlineCode")).toBe(false);
    });
});

describe("soft-break trailing whitespace", () => {
    // Regression: mdast strips trailing whitespace from each line of a
    // soft-broken paragraph. addLines used to mistake that length diff
    // for a leading indent and strip the first character of the next
    // line — making logical text "We" become "e", "However" become
    // "owever", etc., which then triggered bogus "capitalise sentence
    // start" matches from the LLM.
    function logicalOf(src: string): string {
        const ann = parse(src);
        return ann.annotations.annotations
            .map((a: { text?: string; markup?: string; interpretAs?: string }) =>
                a.text !== undefined ? a.text : (a.interpretAs ?? ""))
            .join("");
    }

    test("does not strip first char of next line (simple case)", () => {
        // Trailing space before \n is the trigger.
        const logical = logicalOf("First sentence. \nWe realised that.");
        expect(logical).toContain("We realised");
        expect(logical).not.toContain("\ne realised");
    });

    test("multiple soft breaks across multiple paragraphs", () => {
        // Real-world Obsidian-style text: every line ends with a
        // stray space, paragraphs separated by blank lines.
        const src = [
            "Last monday, me and my colleague was discussing the website. ",
            "We realised that the design looked too gray. ",
            "The team have decided to make several improvements.",
            "",
            "If I would have more time, I will check every page. ",
            "However, the project manager said it must be finished by Friday.",
        ].join("\n");
        const logical = logicalOf(src);
        expect(logical).toContain("We realised");
        expect(logical).toContain("However,");
        expect(logical).not.toContain("\ne realised");
        expect(logical).not.toContain("\nowever,");
    });
});

describe("markdown samples", () => {
    // iterate over all files in the samples directory
    const files = readdirSync("test");
    for (const file of files) {
        test(`sample ${file}`, () => {
            const input = readFileSync(`test/${file}`, "utf-8");
            const { offset, annotations } = parse(input);
            console.info(file, "Offset", offset);
            console.info(file, "Annotations", annotations.annotations);
            expect(annotations.length()).toBe(input.trimEnd().length);
        });
    }
});
