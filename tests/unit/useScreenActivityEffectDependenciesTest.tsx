import {hidden, resetLog, runEveryConfig, spec, visible} from '../utils/ScreenActivityEffectTestUtils';

/**
 * The hook keeps its own copy of the dependencies of the live setup, because the reveal has to tell a dependency change
 * that landed while the screen was hidden from the same work coming back. These tests compare that copy to what
 * useEffect does with the same dependency list.
 */

const SCENARIOS = {
    emptyDeps: [visible(spec('s', 'a', {kind: 'givenDeps', deps: []})), hidden(spec('s', 'a', {kind: 'givenDeps', deps: []})), visible(spec('s', 'a', {kind: 'givenDeps', deps: []}))],

    lengthChangeWhileHidden: [
        visible(spec('s', 'a', {kind: 'givenDeps', deps: ['a']})),
        hidden(spec('s', 'a', {kind: 'givenDeps', deps: ['a']})),
        hidden(spec('s', 'a', {kind: 'givenDeps', deps: ['a', 'b']})),
        visible(spec('s', 'a', {kind: 'givenDeps', deps: ['a', 'b']})),
    ],

    identityOfTheDeps: [
        visible(spec('s', 'a', {kind: 'givenDeps', deps: [Number.NaN]})),
        hidden(spec('s', 'a', {kind: 'givenDeps', deps: [Number.NaN]})),
        visible(spec('s', 'a', {kind: 'givenDeps', deps: [Number.NaN]})),
        visible(spec('s', 'a', {kind: 'givenDeps', deps: [0]})),
        visible(spec('s', 'a', {kind: 'givenDeps', deps: [-0]})),
    ],

    unstableDeps: [
        visible(spec('s', 'a', {kind: 'unstableDeps'})),
        hidden(spec('s', 'a', {kind: 'unstableDeps'})),
        hidden(spec('s', 'a', {kind: 'unstableDeps'})),
        visible(spec('s', 'a', {kind: 'unstableDeps'})),
    ],

    undeclaredValueChangesWhileHidden: [
        visible(spec('u', 's', {kind: 'undeclared', secondValue: 'first'})),
        hidden(spec('u', 's', {kind: 'undeclared', secondValue: 'second'})),
        visible(spec('u', 's', {kind: 'undeclared', secondValue: 'third'})),
    ],

    stateWrittenFromTheBody: [visible(spec('w', 'a', {kind: 'stateWriter'})), hidden(spec('w', 'a', {kind: 'stateWriter'})), visible(spec('w', 'a', {kind: 'stateWriter'}))],
} as const;

describe('useScreenActivityEffect dependencies', () => {
    beforeEach(() => {
        resetLog();
    });

    it('keeps a setup with an empty dependency list live through a cover and reveal cycle', () => {
        const runs = runEveryConfig(SCENARIOS.emptyDeps);
        const expected = [['setup:s:a'], [], [], ['cleanup:s:a']];

        expect(runs.liveUseEffect).toEqual(expected);
        expect(runs.activityScreenActivityEffect).toEqual(expected);

        // Plain useEffect runs a mount-once effect again for every reveal.
        expect(runs.activityUseEffect).toEqual([['setup:s:a'], ['cleanup:s:a'], ['setup:s:a'], ['cleanup:s:a']]);
    });

    it('compares the dependencies with Object.is, exactly as useEffect does', () => {
        const runs = runEveryConfig(SCENARIOS.identityOfTheDeps);

        // NaN is equal to itself under Object.is, and minus zero is not equal to zero.
        const expected = [['setup:s:a'], [], [], ['cleanup:s:a', 'setup:s:a'], ['cleanup:s:a', 'setup:s:a'], ['cleanup:s:a']];
        expect(runs.liveUseEffect).toEqual(expected);
        expect(runs.activityScreenActivityEffect).toEqual(expected);
    });

    it('treats a dependency list that changed size as a change, which useEffect does not', () => {
        // React only compares the dependencies the shorter of the two lists has, and warns about the size change.
        const warn = jest.spyOn(console, 'error').mockImplementation(() => {});
        const runs = runEveryConfig(SCENARIOS.lengthChangeWhileHidden);
        warn.mockRestore();

        expect(runs.liveUseEffect).toEqual([['setup:s:a'], [], [], [], ['cleanup:s:a']]);
        expect(runs.activityScreenActivityEffect).toEqual([['setup:s:a'], [], [], ['cleanup:s:a', 'setup:s:a'], ['cleanup:s:a']]);
    });

    it('coalesces a dependency that is a new object on every render into one run per reveal', () => {
        const runs = runEveryConfig(SCENARIOS.unstableDeps);

        // A live screen runs the effect again for every render, because the dependency is never the same object.
        expect(runs.liveUseEffect).toEqual([['setup:s:a'], ['cleanup:s:a', 'setup:s:a'], ['cleanup:s:a', 'setup:s:a'], ['cleanup:s:a', 'setup:s:a'], ['cleanup:s:a']]);

        // The renders that happened while hidden ran no effects, so the reveal is one release and one setup.
        expect(runs.activityScreenActivityEffect).toEqual([['setup:s:a'], [], [], ['cleanup:s:a', 'setup:s:a'], ['cleanup:s:a']]);
    });

    it('keeps the values the surviving setup captured, exactly as the live screen does', () => {
        const runs = runEveryConfig(SCENARIOS.undeclaredValueChangesWhileHidden);

        // The value that is not a dependency changed twice, and neither screen sees it, because neither ran the body.
        const expected = [['setup:u:s(first)'], [], [], ['cleanup:u:s(first)']];
        expect(runs.liveUseEffect).toEqual(expected);
        expect(runs.activityScreenActivityEffect).toEqual(expected);

        // Plain useEffect ran the body again on the reveal, so its live setup captured the value of that render.
        expect(runs.activityUseEffect).toEqual([['setup:u:s(first)'], ['cleanup:u:s(first)'], ['setup:u:s(third)'], ['cleanup:u:s(third)']]);
    });

    it('runs a state update from the effect body once, exactly as the live screen does', () => {
        const runs = runEveryConfig(SCENARIOS.stateWrittenFromTheBody);

        const expected = [['setup:w:a(0)', 'cleanup:w:a(0)', 'setup:w:a(1)'], [], [], ['cleanup:w:a(1)']];
        expect(runs.liveUseEffect).toEqual(expected);
        expect(runs.activityScreenActivityEffect).toEqual(expected);
    });
});
