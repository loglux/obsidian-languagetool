import { describe, expect, test } from "@jest/globals";
import { isResponseStale, DocSource } from "../editor/race-guard";

/**
 * Regression coverage for the auto-check race condition. See
 * editor/race-guard.ts for the underlying problem.
 *
 * Each test simulates a `view` whose `sliceDoc()` returns the doc text at
 * the moment of the call — modelling what happens when the user keeps typing
 * while an LT request is in flight.
 */

function makeView(initial: string): DocSource & { setText: (s: string) => void } {
    let docText = initial;
    return {
        state: { sliceDoc: () => docText },
        setText: (s: string) => { docText = s; },
    };
}

describe("isResponseStale", () => {
    test("fresh: doc unchanged → not stale", () => {
        const view = makeView("Hello world.");
        expect(isResponseStale(view, "Hello world.")).toBe(false);
    });

    test("stale: characters appended after request was sent", () => {
        const view = makeView("Hello world.");
        view.setText("Hello world. New paragraph.");
        expect(isResponseStale(view, "Hello world.")).toBe(true);
    });

    test("stale: characters deleted from end", () => {
        const view = makeView("Hello world.");
        view.setText("Hello world");
        expect(isResponseStale(view, "Hello world.")).toBe(true);
    });

    test("stale: characters inserted before the snapshotted range", () => {
        const view = makeView("World.");
        view.setText("Hello, World.");
        expect(isResponseStale(view, "World.")).toBe(true);
    });

    test("stale: text completely replaced", () => {
        const view = makeView("Original sentence.");
        view.setText("Entirely different content.");
        expect(isResponseStale(view, "Original sentence.")).toBe(true);
    });

    test("re-evaluates each call (time-of-check semantics)", () => {
        // Models: snapshot taken, await begins, edit happens, await resolves.
        // The guard must read live state, not a captured value.
        const view = makeView("abc");
        const snapshot = view.state.sliceDoc();
        expect(isResponseStale(view, snapshot)).toBe(false);
        view.setText("abcd");
        expect(isResponseStale(view, snapshot)).toBe(true);
    });

    test("empty document: both empty is fresh", () => {
        const view = makeView("");
        expect(isResponseStale(view, "")).toBe(false);
    });

    test("empty document: was empty, now non-empty", () => {
        const view = makeView("");
        view.setText("typed");
        expect(isResponseStale(view, "")).toBe(true);
    });
});
