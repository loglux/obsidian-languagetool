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
