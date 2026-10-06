import {act, render, screen} from '@testing-library/react-native';

import type * as WebIsResizingModule from '@hooks/useIsResizing/index.ts';

import {Activity} from 'react';
import {View} from 'react-native';

// The explicit extension skips the jest platform resolution, which picks the constant index.native.ts for a bare path.
const {default: useIsResizing} = jest.requireActual<typeof WebIsResizingModule>('@hooks/useIsResizing/index.ts');

// Mirrors the private settle delay in useIsResizing.
const RESIZE_SETTLE_DELAY = 500;

const PROBE_TEST_ID = 'isResizingProbe';

function IsResizingProbe() {
    const isResizing = useIsResizing();
    return (
        <View
            testID={PROBE_TEST_ID}
            accessibilityLabel={isResizing ? 'resizing' : 'notResizing'}
        />
    );
}

function emitResize() {
    act(() => {
        window.dispatchEvent(new Event('resize'));
    });
}

function advanceTimers(ms: number) {
    act(() => {
        jest.advanceTimersByTime(ms);
    });
}

describe('useIsResizing (web) across Activity hide and reveal', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    it('reports a settled layout after a reveal when the hide landed mid-resize', () => {
        // Given a visible probe that is mid-resize, with its settle timeout still pending
        const {rerender} = render(
            <Activity mode="visible">
                <IsResizingProbe />
            </Activity>,
        );
        emitResize();
        expect(screen.getByTestId(PROBE_TEST_ID)).toHaveProp('accessibilityLabel', 'resizing');

        // When the probe is hidden before the settle delay, stays hidden past it, and is revealed
        rerender(
            <Activity mode="hidden">
                <IsResizingProbe />
            </Activity>,
        );
        advanceTimers(RESIZE_SETTLE_DELAY);
        rerender(
            <Activity mode="visible">
                <IsResizingProbe />
            </Activity>,
        );
        advanceTimers(RESIZE_SETTLE_DELAY);

        // Then the probe is settled, because the hide cleared the timeout and no further resize event will settle it
        expect(screen.getByTestId(PROBE_TEST_ID)).toHaveProp('accessibilityLabel', 'notResizing');
    });
});
