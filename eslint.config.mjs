import globals from "globals";
import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";

/** @type {import('eslint').Linter.Config[]} */
export default [
    { files: ["src/**/*.ts"] },
    {
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: "./tsconfig.json",
                tsconfigRootDir: import.meta.dirname,
            },
            globals: { ...globals.node, ...globals.jest },
        },
    },
    ...tseslint.configs.recommended,
    ...obsidianmd.configs.recommended,
    {
        rules: {
            "no-unused-vars": "off",
            "@typescript-eslint/no-unused-vars": ["error", {
                args: "none",
                varsIgnorePattern: "^_",
            }],
            "@typescript-eslint/ban-ts-comment": "off",
            "no-prototype-builtins": "off",
            "@typescript-eslint/no-empty-function": "off",
            // The plugin code interacts heavily with Obsidian internals via
            // `as any` casts (their type defs lag behind runtime API). We
            // keep the bug-finding rules (no-floating-promises,
            // no-misused-promises) but turn off the `unsafe-*` family for
            // legacy code.
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            // Style rules with too many false positives (proper nouns like
            // "LanguageTool" trigger sentence-case; "settings" word in tab
            // headings is unavoidable for this plugin). We keep the
            // bug-finding rules from obsidianmd enabled.
            "obsidianmd/ui/sentence-case": "off",
            "obsidianmd/settings-tab/no-problematic-settings-headings": "off",
            "obsidianmd/rule-custom-message": "off",
        },
    },
    // Test files are dev-time only: relax obsidianmd UI / console / mobile rules
    // that target shipped plugin code.
    {
        files: ["src/test/**/*.ts"],
        rules: {
            "obsidianmd/rule-custom-message": "off",
            "obsidianmd/ui/sentence-case": "off",
            "obsidianmd/no-nodejs-modules": "off",
            "obsidianmd/settings-tab/no-problematic-settings-headings": "off",
        },
    },
];
