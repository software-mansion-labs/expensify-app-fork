import type {ReactNode} from 'react';

import {useEffect, useRef} from 'react';
import {AccessibilityInfo} from 'react-native';

import type UseAccessibilityAnnouncementOptions from './types';

const DELAY_FOR_ACCESSIBILITY_TREE_SYNC = 100;

function useAccessibilityAnnouncement(message: string | ReactNode, shouldAnnounceMessage: boolean, options?: UseAccessibilityAnnouncementOptions) {
    const previousAnnouncedMessageRef = useRef('');
    const previousKeyRef = useRef(options?.announcementKey);
    // Default true preserves legacy iOS callers that omit the flag; Header sets false for web-only dialog announces.
    const shouldAnnounceOnNative = options?.shouldAnnounceOnNative ?? true;

    useEffect(() => {
        if (!shouldAnnounceOnNative || !shouldAnnounceMessage || typeof message !== 'string' || !message.trim()) {
            previousAnnouncedMessageRef.current = '';
            return;
        }

        const keyChanged = options?.announcementKey !== undefined && options.announcementKey !== previousKeyRef.current;
        previousKeyRef.current = options?.announcementKey;

        if (!keyChanged && previousAnnouncedMessageRef.current === message) {
            return;
        }

        previousAnnouncedMessageRef.current = message;
        let hasAnnounced = false;

        // On iOS real devices, a brief delay helps the accessibility tree sync before announcing.
        const timeout = setTimeout(() => {
            hasAnnounced = true;
            AccessibilityInfo.announceForAccessibility(message);
        }, DELAY_FOR_ACCESSIBILITY_TREE_SYNC);

        return () => {
            clearTimeout(timeout);
            if (hasAnnounced) {
                return;
            }
            // Forget an announcement that never fired (hide, unmount or a newer message) so the next setup schedules it again.
            previousAnnouncedMessageRef.current = '';
        };
    }, [message, shouldAnnounceMessage, shouldAnnounceOnNative, options?.announcementKey]);
}

export default useAccessibilityAnnouncement;
