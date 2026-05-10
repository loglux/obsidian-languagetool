/**
 * Guards against applying an LT response to a document that has changed since
 * the request was sent.
 *
 * Background: between `api.check()` resolving and `editor.dispatch()` applying
 * underlines, the user can keep editing. Match offsets returned by the API
 * are relative to the text we *sent*, so applying them to the *current* doc
 * results in underlines on the wrong content (the long-standing
 * "underlines may not move correctly" issue).
 *
 * The guard works by snapshotting the doc text before the request and
 * comparing it to the live text after the request resolves. The auto-check
 * extension already reschedules a fresh run on every doc change, so dropping
 * a stale result is safe — the next pass picks up the new state.
 */

/** Minimal shape we need from CodeMirror's EditorView for the guard. */
export interface DocSource {
    state: {
        sliceDoc(): string;
    };
}

/**
 * Returns true when the live document differs from the snapshot taken before
 * the network call (i.e. the response is stale and should be dropped).
 */
export function isResponseStale(view: DocSource, snapshot: string): boolean {
    return view.state.sliceDoc() !== snapshot;
}
