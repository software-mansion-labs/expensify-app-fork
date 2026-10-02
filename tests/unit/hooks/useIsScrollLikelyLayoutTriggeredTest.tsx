import {act, render} from '@testing-library/react-native';

import useIsScrollLikelyLayoutTriggered from '@hooks/useIsScrollLikelyLayoutTriggered';

import {Activity} from 'react';

type ScrollLayoutState = ReturnType<typeof useIsScrollLikelyLayoutTriggered>;

const LOWER_FLAG_WAIT_MS = 500;

function ScrollLayoutProbe({onRender}: {onRender: (state: ScrollLayoutState) => void}) {
    onRender(useIsScrollLikelyLayoutTriggered());
    return null;
}

describe('useIsScrollLikelyLayoutTriggered', () => {
    let latestState: ScrollLayoutState | undefined;
    const recordState = (state: ScrollLayoutState) => {
        latestState = state;
    };

    beforeEach(() => {
        jest.useFakeTimers();
        latestState = undefined;
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    it('lowers the flag when the screen is hidden inside the debounce window and revealed again', () => {
        // Given a composer that raised the flag because a text change triggered a layout scroll
        const {rerender} = render(
            <Activity mode="visible">
                <ScrollLayoutProbe onRender={recordState} />
            </Activity>,
        );
        act(() => {
            latestState?.raiseIsScrollLayoutTriggered();
            jest.advanceTimersByTime(LOWER_FLAG_WAIT_MS / 5);
        });
        expect(latestState?.isScrollLayoutTriggered.current).toBe(true);

        // When the screen is hidden before the pending lower fires, which runs every effect cleanup, and is revealed later
        rerender(
            <Activity mode="hidden">
                <ScrollLayoutProbe onRender={recordState} />
            </Activity>,
        );
        act(() => {
            jest.advanceTimersByTime(LOWER_FLAG_WAIT_MS * 2);
        });
        rerender(
            <Activity mode="visible">
                <ScrollLayoutProbe onRender={recordState} />
            </Activity>,
        );
        act(() => {
            jest.advanceTimersByTime(LOWER_FLAG_WAIT_MS * 2);
        });

        // Then the hide flushed the pending lower, so real user scrolls after the reveal are not mistaken for layout scrolls
        expect(latestState?.isScrollLayoutTriggered.current).toBe(false);
    });

    it('lowers the flag once the debounce wait elapses on a screen that stays visible', () => {
        // Given a mounted composer outside of any Activity boundary
        render(<ScrollLayoutProbe onRender={recordState} />);

        // When a text change raises the flag
        act(() => {
            latestState?.raiseIsScrollLayoutTriggered();
        });

        // Then the flag stays raised for the whole debounce window so the trailing layout scrolls are ignored
        expect(latestState?.isScrollLayoutTriggered.current).toBe(true);
        act(() => {
            jest.advanceTimersByTime(LOWER_FLAG_WAIT_MS - 1);
        });
        expect(latestState?.isScrollLayoutTriggered.current).toBe(true);

        // Then the flag drops right when the wait elapses so later scrolls count as user scrolls again
        act(() => {
            jest.advanceTimersByTime(1);
        });
        expect(latestState?.isScrollLayoutTriggered.current).toBe(false);
    });

    it('lowers the flag without errors when the composer unmounts inside the debounce window', () => {
        // Given a composer that raised the flag and a console spy, because a flush after unmount must not warn or throw
        const consoleErrorSpy = jest.spyOn(console, 'error');
        const {unmount} = render(<ScrollLayoutProbe onRender={recordState} />);
        act(() => {
            latestState?.raiseIsScrollLayoutTriggered();
            jest.advanceTimersByTime(LOWER_FLAG_WAIT_MS / 5);
        });
        const flagRef = latestState?.isScrollLayoutTriggered;
        expect(flagRef?.current).toBe(true);

        // When the composer unmounts before the pending lower fires
        unmount();
        act(() => {
            jest.advanceTimersByTime(LOWER_FLAG_WAIT_MS * 2);
        });

        // Then the unmount flushed the lower and nothing was reported
        expect(flagRef?.current).toBe(false);
        expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
});
