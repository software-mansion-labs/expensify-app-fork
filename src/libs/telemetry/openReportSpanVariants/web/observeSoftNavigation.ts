import type {QuietWindowResult} from './createQuietWindow';
import type {EntriesObserver} from './performanceEntries';

import createQuietWindow from './createQuietWindow';
import {isEntryTypeSupported, observeEntries, readPaintedAt} from './performanceEntries';

type SoftNavigationCallbacks = {
    /** The soft navigation entry: the first contentful paint after the interaction changed the URL. */
    onFirstPaint: (paintedAt: number) => void;
    /** The last interaction-contentful-paint candidate, like LCP for a soft navigation. */
    onLargestPaint: (result: QuietWindowResult) => void;
};

const SOFT_NAVIGATION_ENTRY = 'soft-navigation';
const INTERACTION_CONTENTFUL_PAINT_ENTRY = 'interaction-contentful-paint';
const QUIET_WINDOW_MS = 500;

function isSoftNavigationSupported() {
    return isEntryTypeSupported(SOFT_NAVIGATION_ENTRY) && isEntryTypeSupported(INTERACTION_CONTENTFUL_PAINT_ENTRY);
}

/** Chromium numbers navigations, other builds may use strings, so compare the raw values. */
function readNavigationId(entry: PerformanceEntry): unknown {
    return Reflect.get(entry, 'navigationId');
}

/** Chromium's soft navigation heuristics for the interaction that started at `inputTimeStamp`. */
function observeSoftNavigation(inputTimeStamp: number, {onFirstPaint, onLargestPaint}: SoftNavigationCallbacks) {
    let navigationId: unknown;
    let navigations: EntriesObserver | undefined;
    let paints: EntriesObserver | undefined;
    const pendingPaints: PerformanceEntry[] = [];

    const largestPaint = createQuietWindow(QUIET_WINDOW_MS, (result) => {
        cleanup();
        onLargestPaint(result);
    });

    function cleanup() {
        navigations?.disconnect();
        paints?.disconnect();
        largestPaint.stop();
    }

    const recordPaint = (entry: PerformanceEntry) => {
        if (readNavigationId(entry) !== navigationId) {
            return;
        }
        largestPaint.record(readPaintedAt(entry));
    };

    navigations = observeEntries(SOFT_NAVIGATION_ENTRY, (entries) => {
        const entry = entries.find((candidate) => candidate.startTime >= inputTimeStamp - 1);
        if (!entry || navigationId !== undefined) {
            return;
        }
        navigationId = readNavigationId(entry);
        onFirstPaint(readPaintedAt(entry));
        for (const paint of pendingPaints) {
            recordPaint(paint);
        }
        largestPaint.arm(readPaintedAt(entry));
    });
    paints = observeEntries(INTERACTION_CONTENTFUL_PAINT_ENTRY, (entries) => {
        for (const entry of entries) {
            if (navigationId === undefined) {
                pendingPaints.push(entry);
            } else {
                recordPaint(entry);
            }
        }
    });

    return cleanup;
}

export default observeSoftNavigation;
export {isSoftNavigationSupported};
