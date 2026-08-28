import React, {useEffect, useRef, useState} from 'react';

import renderCoverableScreen, {getCoverMode} from '../utils/ScreenCoverHarness';

let effectLog: string[] = [];
let survivals: Array<{stateIdentity: Record<string, unknown>; refValue: string}> = [];

/** Records what the effect lifecycle did, which is the only difference between the two behaviors. */
function EffectLogProbe() {
    useEffect(() => {
        effectLog.push('effect');
        return () => {
            effectLog.push('cleanup');
        };
    }, []);

    return null;
}

/**
 * Records the identity of a lazily initialized state value and a ref set at mount. The initializer runs once per
 * state creation, so an unchanged identity is proof the state was carried over rather than started again.
 */
function SurvivalProbe() {
    const [stateIdentity] = useState<Record<string, unknown>>(() => ({}));
    const survivingRef = useRef('set-at-mount');

    useEffect(() => {
        survivals.push({stateIdentity, refValue: survivingRef.current});
    });

    return null;
}

/**
 * Guards the harness the chat-window lifecycle suite is built on: covering a screen must leave state and refs alone
 * while doing to the effects exactly what the configured mode promises.
 */
describe('ScreenCoverHarness', () => {
    beforeEach(() => {
        effectLog = [];
        survivals = [];
    });

    it('runs the mount effect exactly once before any cover happens', () => {
        renderCoverableScreen(<EffectLogProbe />);

        expect(effectLog).toEqual(['effect']);
    });

    it('cleans up and re-runs effects on a hide/reveal cycle only under activity', async () => {
        const screen = renderCoverableScreen(<EffectLogProbe />);
        effectLog = [];

        await screen.hide();
        await screen.reveal();

        if (getCoverMode() === 'activity') {
            expect(effectLog).toEqual(['cleanup', 'effect']);
        } else {
            expect(effectLog).toEqual([]);
        }
    });

    it('runs the mount effect of a screen that mounts already covered, in both modes', () => {
        renderCoverableScreen(<EffectLogProbe />, {startCovered: true});

        // Neither behavior may skip the mount work of a screen that mounts underneath another one, or a deep-linked
        // screen would fetch nothing and the reveal would show a loading state.
        expect(effectLog).toContain('effect');
    });

    it('keeps state and refs across a hide/reveal cycle in both modes', async () => {
        const screen = renderCoverableScreen(<SurvivalProbe />);

        await screen.hide();
        await screen.reveal();

        expect(survivals.at(-1)?.stateIdentity).toBe(survivals.at(0)?.stateIdentity);
        expect(survivals.at(-1)?.refValue).toBe('set-at-mount');
    });
});
