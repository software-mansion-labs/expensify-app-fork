import React, {useEffect, useRef, useState} from 'react';

import renderCoverableScreen, {getCoverMode} from '../utils/ScreenCoverHarness';

/**
 * Guards the harness the chat-window lifecycle suite is built on: covering a screen must leave state and refs alone
 * while doing to the effects exactly what the configured mode promises.
 */
describe('ScreenCoverHarness', () => {
    it('runs the mount effect exactly once before any cover happens', async () => {
        const calls: string[] = [];

        function Probe() {
            useEffect(() => {
                calls.push('effect');
                return () => {
                    calls.push('cleanup');
                };
            }, []);
            return null;
        }

        renderCoverableScreen(<Probe />);

        expect(calls).toEqual(['effect']);
    });

    it('cleans up and re-runs effects on a hide/reveal cycle only under activity', async () => {
        const calls: string[] = [];

        function Probe() {
            useEffect(() => {
                calls.push('effect');
                return () => {
                    calls.push('cleanup');
                };
            }, []);
            return null;
        }

        const screen = renderCoverableScreen(<Probe />);
        calls.length = 0;

        await screen.hide();
        await screen.reveal();

        if (getCoverMode() === 'activity') {
            expect(calls).toEqual(['cleanup', 'effect']);
        } else {
            expect(calls).toEqual([]);
        }
    });

    it('keeps state and refs across a hide/reveal cycle in both modes', async () => {
        const seen: Array<{count: number; refValue: string | undefined}> = [];

        function Probe() {
            const [count, setCount] = useState(0);
            const ref = useRef<string | undefined>(undefined);
            ref.current ??= 'set-at-mount';
            seen.push({count, refValue: ref.current});

            useEffect(() => {
                setCount((value) => value + 1);
            }, []);

            return null;
        }

        const screen = renderCoverableScreen(<Probe />);
        const countBeforeHide = seen.at(-1)?.count;

        await screen.hide();
        await screen.reveal();

        // The mount effect bumps the counter once per effect mount, so activity adds one; neither mode may reset it.
        const expectedCount = getCoverMode() === 'activity' ? (countBeforeHide ?? 0) + 1 : countBeforeHide;
        expect(seen.at(-1)?.count).toBe(expectedCount);
        expect(seen.at(-1)?.refValue).toBe('set-at-mount');
    });
});
