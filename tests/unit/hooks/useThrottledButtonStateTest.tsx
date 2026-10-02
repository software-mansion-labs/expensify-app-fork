import {act, render} from '@testing-library/react-native';

import useThrottledButtonState from '@hooks/useThrottledButtonState';

import {Activity} from 'react';

type ThrottledButtonState = ReturnType<typeof useThrottledButtonState>;

type ThrottledButtonProbeProps = {
    onReset?: () => void;
    onRender: (state: ThrottledButtonState) => void;
};

function ThrottledButtonProbe({onReset, onRender}: ThrottledButtonProbeProps) {
    onRender(useThrottledButtonState(onReset));
    return null;
}

const START_TIME = new Date('2026-01-01T12:00:00Z').getTime();

let latestState: ThrottledButtonState | undefined;

function recordState(state: ThrottledButtonState) {
    latestState = state;
}

function getLatestState(): ThrottledButtonState {
    if (!latestState) {
        throw new Error('ThrottledButtonProbe has not rendered yet');
    }
    return latestState;
}

function isButtonActive() {
    return getLatestState()[0];
}

function pressButton() {
    const [, setInactive] = getLatestState();
    act(() => {
        setInactive();
    });
}

function advanceTime(milliseconds: number) {
    act(() => {
        jest.advanceTimersByTime(milliseconds);
    });
}

describe('useThrottledButtonState', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(START_TIME);
        latestState = undefined;
    });

    it('reactivates the button 1800 ms after a press while the screen stays visible', () => {
        // Given a visible button with an onReset callback
        const onReset = jest.fn();
        const probe = (
            <ThrottledButtonProbe
                onReset={onReset}
                onRender={recordState}
            />
        );
        render(<Activity mode="visible">{probe}</Activity>);

        // When the button is pressed
        pressButton();

        // Then it stays inactive for the whole throttle window
        expect(isButtonActive()).toBe(false);
        advanceTime(1799);
        expect(isButtonActive()).toBe(false);
        expect(onReset).not.toHaveBeenCalled();

        // Then it becomes active again exactly when the window ends, with a single reset
        advanceTime(1);
        expect(isButtonActive()).toBe(true);
        expect(onReset).toHaveBeenCalledTimes(1);
    });

    it('waits only the time left after a reveal instead of a fresh 1800 ms', () => {
        // Given a button pressed at 0 ms and hidden at 1000 ms, which clears the pending timer
        const onReset = jest.fn();
        const probe = (
            <ThrottledButtonProbe
                onReset={onReset}
                onRender={recordState}
            />
        );
        const {rerender} = render(<Activity mode="visible">{probe}</Activity>);
        pressButton();
        advanceTime(1000);
        rerender(<Activity mode="hidden">{probe}</Activity>);
        advanceTime(500);
        expect(onReset).not.toHaveBeenCalled();

        // When the screen is revealed at 1500 ms
        rerender(<Activity mode="visible">{probe}</Activity>);

        // Then the button reactivates 300 ms later, at the original 1800 ms deadline
        advanceTime(299);
        expect(isButtonActive()).toBe(false);
        advanceTime(1);
        expect(isButtonActive()).toBe(true);
        expect(onReset).toHaveBeenCalledTimes(1);
    });

    it('reactivates right after a reveal when the deadline passed while hidden', () => {
        // Given a button pressed at 0 ms and hidden from 1000 ms to 3000 ms, past its 1800 ms deadline
        const onReset = jest.fn();
        const probe = (
            <ThrottledButtonProbe
                onReset={onReset}
                onRender={recordState}
            />
        );
        const {rerender} = render(<Activity mode="visible">{probe}</Activity>);
        pressButton();
        advanceTime(1000);
        rerender(<Activity mode="hidden">{probe}</Activity>);
        advanceTime(2000);
        expect(onReset).not.toHaveBeenCalled();

        // When the screen is revealed
        rerender(<Activity mode="visible">{probe}</Activity>);
        expect(isButtonActive()).toBe(false);

        // Then a zero-delay timer reactivates the button with a single reset
        advanceTime(0);
        expect(isButtonActive()).toBe(true);
        expect(onReset).toHaveBeenCalledTimes(1);

        // Then no later timer resets it a second time
        advanceTime(5000);
        expect(onReset).toHaveBeenCalledTimes(1);
    });

    it('does not extend the wait when the button is pressed again while inactive', () => {
        // Given a button pressed at 0 ms and pressed again at 1000 ms while still inactive
        const onReset = jest.fn();
        const probe = (
            <ThrottledButtonProbe
                onReset={onReset}
                onRender={recordState}
            />
        );
        const {rerender} = render(<Activity mode="visible">{probe}</Activity>);
        pressButton();
        advanceTime(1000);
        pressButton();
        expect(isButtonActive()).toBe(false);

        // When a hide at 1200 ms and a reveal at 1300 ms re-run the effect after the second press
        advanceTime(200);
        rerender(<Activity mode="hidden">{probe}</Activity>);
        advanceTime(100);
        rerender(<Activity mode="visible">{probe}</Activity>);

        // Then the button still reactivates at the deadline of the first press, 1800 ms
        advanceTime(499);
        expect(isButtonActive()).toBe(false);
        advanceTime(1);
        expect(isButtonActive()).toBe(true);
        expect(onReset).toHaveBeenCalledTimes(1);
    });

    it('waits only the time left when onReset changes while the button is inactive', () => {
        // Given a button pressed at 0 ms with a first onReset callback
        const firstOnReset = jest.fn();
        const secondOnReset = jest.fn();
        const {rerender} = render(
            <ThrottledButtonProbe
                onReset={firstOnReset}
                onRender={recordState}
            />,
        );
        pressButton();
        advanceTime(1000);

        // When the parent passes a new onReset at 1000 ms, which re-runs the effect
        rerender(
            <ThrottledButtonProbe
                onReset={secondOnReset}
                onRender={recordState}
            />,
        );

        // Then the button reactivates at the original 1800 ms deadline instead of 1800 ms after the change
        advanceTime(799);
        expect(isButtonActive()).toBe(false);
        advanceTime(1);
        expect(isButtonActive()).toBe(true);

        // Then only the current callback runs, and only once
        advanceTime(5000);
        expect(firstOnReset).not.toHaveBeenCalled();
        expect(secondOnReset).toHaveBeenCalledTimes(1);
    });

    it('caps the wait after a reveal at 1800 ms when the clock stepped backwards while hidden', () => {
        // Given a button pressed at 0 ms and hidden at 1000 ms
        const onReset = jest.fn();
        const probe = (
            <ThrottledButtonProbe
                onReset={onReset}
                onRender={recordState}
            />
        );
        const {rerender} = render(<Activity mode="visible">{probe}</Activity>);
        pressButton();
        advanceTime(1000);
        rerender(<Activity mode="hidden">{probe}</Activity>);

        // When the system clock steps back an hour while hidden, which puts the stored deadline far in the future, and the screen is revealed
        jest.setSystemTime(START_TIME - 60 * 60 * 1000);
        rerender(<Activity mode="visible">{probe}</Activity>);

        // Then the button reactivates within 1800 ms of the reveal instead of waiting out the clock step
        advanceTime(1800);
        expect(isButtonActive()).toBe(true);
        expect(onReset).toHaveBeenCalledTimes(1);
    });
});
