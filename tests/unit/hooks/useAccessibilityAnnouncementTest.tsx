import {act, render} from '@testing-library/react-native';

import useIOSAccessibilityAnnouncement from '@hooks/useAccessibilityAnnouncement/index.ios';
import type * as WebAnnouncementModule from '@hooks/useAccessibilityAnnouncement/index.ts';

import {Activity} from 'react';
import {AccessibilityInfo} from 'react-native';

// The explicit extension skips the jest platform resolution, which picks index.ios.ts for a bare path.
const {default: useWebAccessibilityAnnouncement} = jest.requireActual<typeof WebAnnouncementModule>('@hooks/useAccessibilityAnnouncement/index.ts');

// Longer than both the iOS (100 ms) and web (300 ms) announcement delays.
const PAST_DELAY_MS = 400;

type AnnouncerProps = {
    message: string;
    announcementKey?: number;
};

function IOSAnnouncer({message, announcementKey}: AnnouncerProps) {
    useIOSAccessibilityAnnouncement(message, true, {announcementKey});
    return null;
}

function WebAnnouncer({message, announcementKey}: AnnouncerProps) {
    useWebAccessibilityAnnouncement(message, true, {announcementKey, shouldAnnounceOnWeb: true});
    return null;
}

function advanceTimers(ms: number) {
    act(() => {
        jest.advanceTimersByTime(ms);
    });
}

describe('useAccessibilityAnnouncement (iOS) across Activity hide and reveal', () => {
    let announceSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.useFakeTimers();
        announceSpy = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    });

    afterEach(() => {
        announceSpy.mockRestore();
        jest.useRealTimers();
    });

    it('announces a message once on reveal when a hide cleared its pending timer', () => {
        // Given a visible screen that already announced A and now schedules B
        const {rerender} = render(
            <Activity mode="visible">
                <IOSAnnouncer message="A" />
            </Activity>,
        );
        advanceTimers(PAST_DELAY_MS);
        rerender(
            <Activity mode="visible">
                <IOSAnnouncer message="B" />
            </Activity>,
        );

        // When the screen is hidden before B's timer fires and is revealed later
        rerender(
            <Activity mode="hidden">
                <IOSAnnouncer message="B" />
            </Activity>,
        );
        advanceTimers(PAST_DELAY_MS);
        rerender(
            <Activity mode="visible">
                <IOSAnnouncer message="B" />
            </Activity>,
        );
        advanceTimers(PAST_DELAY_MS);

        // Then B is announced exactly once, after the reveal
        expect(announceSpy.mock.calls).toEqual([['A'], ['B']]);
    });

    it('does not repeat an announcement that was made before the hide', () => {
        // Given a visible screen that announced A
        const {rerender} = render(
            <Activity mode="visible">
                <IOSAnnouncer message="A" />
            </Activity>,
        );
        advanceTimers(PAST_DELAY_MS);

        // When the screen is hidden and revealed with the same message
        rerender(
            <Activity mode="hidden">
                <IOSAnnouncer message="A" />
            </Activity>,
        );
        rerender(
            <Activity mode="visible">
                <IOSAnnouncer message="A" />
            </Activity>,
        );
        advanceTimers(PAST_DELAY_MS);

        // Then the reveal does not speak A a second time
        expect(announceSpy.mock.calls).toEqual([['A']]);
    });

    it('re-announces A when the message goes A -> B -> A within the delay', () => {
        // Given a visible screen that announced A
        const {rerender} = render(
            <Activity mode="visible">
                <IOSAnnouncer message="A" />
            </Activity>,
        );
        advanceTimers(PAST_DELAY_MS);

        // When the message changes to B and back to A before B's timer fires
        rerender(
            <Activity mode="visible">
                <IOSAnnouncer message="B" />
            </Activity>,
        );
        advanceTimers(50);
        rerender(
            <Activity mode="visible">
                <IOSAnnouncer message="A" />
            </Activity>,
        );
        advanceTimers(PAST_DELAY_MS);

        // Then A is confirmed again, as a typed-then-deleted digit should be
        expect(announceSpy.mock.calls).toEqual([['A'], ['A']]);
    });

    it('keeps a key-driven re-announcement when a hide lands inside the delay', () => {
        // Given a visible form that announced Err for submit 1 and re-announces it for submit 2
        const {rerender} = render(
            <Activity mode="visible">
                <IOSAnnouncer
                    message="Err"
                    announcementKey={1}
                />
            </Activity>,
        );
        advanceTimers(PAST_DELAY_MS);
        rerender(
            <Activity mode="visible">
                <IOSAnnouncer
                    message="Err"
                    announcementKey={2}
                />
            </Activity>,
        );

        // When the screen is hidden before the re-announcement fires and is revealed later
        rerender(
            <Activity mode="hidden">
                <IOSAnnouncer
                    message="Err"
                    announcementKey={2}
                />
            </Activity>,
        );
        advanceTimers(PAST_DELAY_MS);
        rerender(
            <Activity mode="visible">
                <IOSAnnouncer
                    message="Err"
                    announcementKey={2}
                />
            </Activity>,
        );
        advanceTimers(PAST_DELAY_MS);

        // Then the second submit is still announced
        expect(announceSpy.mock.calls).toEqual([['Err'], ['Err']]);
    });

    it('announces nothing when unmounted while the announcement is pending', () => {
        // Given a visible screen that scheduled A
        const {unmount} = render(
            <Activity mode="visible">
                <IOSAnnouncer message="A" />
            </Activity>,
        );

        // When it unmounts before the timer fires
        unmount();
        advanceTimers(PAST_DELAY_MS);

        // Then nothing is spoken for a screen that is gone
        expect(announceSpy).not.toHaveBeenCalled();
    });
});

describe('useAccessibilityAnnouncement (web) across Activity hide and reveal', () => {
    let announcements: string[];
    let liveRegionObserver: MutationObserver;

    // Each write to the aria-live region replaces its content, so record every added node's text.
    function flushAnnouncements() {
        for (const record of liveRegionObserver.takeRecords()) {
            if (!(record.target instanceof Element) || !record.target.hasAttribute('aria-live')) {
                continue;
            }
            for (const node of Array.from(record.addedNodes)) {
                announcements.push(node.textContent ?? '');
            }
        }
    }

    function advanceWebTimers(ms: number) {
        advanceTimers(ms);
        flushAnnouncements();
    }

    beforeEach(() => {
        jest.useFakeTimers();
        announcements = [];
        liveRegionObserver = new MutationObserver(() => {});
        liveRegionObserver.observe(document.body, {childList: true, subtree: true});
    });

    afterEach(() => {
        liveRegionObserver.disconnect();
        jest.useRealTimers();
    });

    it('announces a message once on reveal when a hide cleared its pending timer', () => {
        // Given a visible screen that already announced A and now schedules B
        const {rerender} = render(
            <Activity mode="visible">
                <WebAnnouncer message="A" />
            </Activity>,
        );
        advanceWebTimers(PAST_DELAY_MS);
        rerender(
            <Activity mode="visible">
                <WebAnnouncer message="B" />
            </Activity>,
        );

        // When the screen is hidden before B's timer fires and is revealed later
        rerender(
            <Activity mode="hidden">
                <WebAnnouncer message="B" />
            </Activity>,
        );
        advanceWebTimers(PAST_DELAY_MS);
        rerender(
            <Activity mode="visible">
                <WebAnnouncer message="B" />
            </Activity>,
        );
        advanceWebTimers(PAST_DELAY_MS);

        // Then B reaches the live region exactly once, after the reveal
        expect(announcements).toEqual(['A', 'B']);
    });

    it('does not repeat an announcement that was made before the hide', () => {
        // Given a visible screen that announced A
        const {rerender} = render(
            <Activity mode="visible">
                <WebAnnouncer message="A" />
            </Activity>,
        );
        advanceWebTimers(PAST_DELAY_MS);

        // When the screen is hidden and revealed with the same message
        rerender(
            <Activity mode="hidden">
                <WebAnnouncer message="A" />
            </Activity>,
        );
        rerender(
            <Activity mode="visible">
                <WebAnnouncer message="A" />
            </Activity>,
        );
        advanceWebTimers(PAST_DELAY_MS);

        // Then the reveal does not write A a second time
        expect(announcements).toEqual(['A']);
    });

    it('re-announces A when the message goes A -> B -> A within the delay', () => {
        // Given a visible screen that announced A
        const {rerender} = render(
            <Activity mode="visible">
                <WebAnnouncer message="A" />
            </Activity>,
        );
        advanceWebTimers(PAST_DELAY_MS);

        // When the message changes to B and back to A before B's timer fires
        rerender(
            <Activity mode="visible">
                <WebAnnouncer message="B" />
            </Activity>,
        );
        advanceWebTimers(50);
        rerender(
            <Activity mode="visible">
                <WebAnnouncer message="A" />
            </Activity>,
        );
        advanceWebTimers(PAST_DELAY_MS);

        // Then A is confirmed again, as a typed-then-deleted digit should be
        expect(announcements).toEqual(['A', 'A']);
    });

    it('keeps a key-driven re-announcement when a hide lands inside the delay', () => {
        // Given a visible form that announced Err for submit 1 and re-announces it for submit 2
        const {rerender} = render(
            <Activity mode="visible">
                <WebAnnouncer
                    message="Err"
                    announcementKey={1}
                />
            </Activity>,
        );
        advanceWebTimers(PAST_DELAY_MS);
        rerender(
            <Activity mode="visible">
                <WebAnnouncer
                    message="Err"
                    announcementKey={2}
                />
            </Activity>,
        );

        // When the screen is hidden before the re-announcement fires and is revealed later
        rerender(
            <Activity mode="hidden">
                <WebAnnouncer
                    message="Err"
                    announcementKey={2}
                />
            </Activity>,
        );
        advanceWebTimers(PAST_DELAY_MS);
        rerender(
            <Activity mode="visible">
                <WebAnnouncer
                    message="Err"
                    announcementKey={2}
                />
            </Activity>,
        );
        advanceWebTimers(PAST_DELAY_MS);

        // Then the second submit is still announced
        expect(announcements).toEqual(['Err', 'Err']);
    });

    it('announces nothing when unmounted while the announcement is pending', () => {
        // Given a visible screen that scheduled A
        const {unmount} = render(
            <Activity mode="visible">
                <WebAnnouncer message="A" />
            </Activity>,
        );

        // When it unmounts before the timer fires
        unmount();
        advanceWebTimers(PAST_DELAY_MS);

        // Then nothing reaches the live region for a screen that is gone
        expect(announcements).toEqual([]);
    });
});
