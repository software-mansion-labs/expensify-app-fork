import {cancelSpan, endSpanWithAttributes, performanceTimeToSentrySeconds, startSpan} from '@libs/telemetry/activeSpans';
import waitForResponsiveFrames from '@libs/telemetry/waitForResponsiveFrames';

import CONST from '@src/CONST';

import type {SpanAttributeValue} from '@sentry/core';

import type {AttachOpenReportList, MarkOpenReport, OpenReportInputEvent, StartOpenReportSpanVariants} from './types';
import type {OpenReportSpanVariant} from './variants';
import type {QuietWindow, QuietWindowResult} from './web/createQuietWindow';

import OPEN_REPORT_SPAN_VARIANT from './variants';
import {afterDoubleFrame, afterNextFrame, afterNextPaint} from './web/afterFrames';
import createQuietWindow from './web/createQuietWindow';
import describeMutation from './web/describeMutation';
import observeDomMutations from './web/observeDomMutations';
import observeElementPaint from './web/observeElementPaint';
import observeInputPaint from './web/observeInputPaint';
import observeIntersection from './web/observeIntersection';
import observeLongAnimationFrames from './web/observeLongAnimationFrames';
import observeSoftNavigation, {isSoftNavigationSupported} from './web/observeSoftNavigation';

type VisualPart = 'report' | 'highlight';

type OpenReportSession = {
    pendingVisualParts: Set<VisualPart>;
    domQuiet: QuietWindow;
    longFramesQuiet: QuietWindow;
    elementPaintComplete: QuietWindow;
    cleanups: Array<() => void>;
    /** Deliver Performance entries still queued when a quiet window is about to close. */
    flushers: {longFrames?: () => void; elementPaint?: () => void};
    startedAt: number;
    /** The last DOM mutation DomQuiet saw, named for its span. */
    mutations: {last?: string};
    committedAt?: number;
    listContainer?: HTMLElement;
};

const ATTRIBUTE_FALLBACK = 'fallback';
const ATTRIBUTE_COUNT = 'count';
const ATTRIBUTE_FRAME_START = 'frame_start_ms';
const ATTRIBUTE_FRAME_DURATION = 'frame_duration_ms';
const ATTRIBUTE_BLOCKING_DURATION = 'blocking_duration_ms';
const ATTRIBUTE_CONTAINS_COMMIT = 'contains_commit';
const ATTRIBUTE_INTERACTION_ID = 'interaction_id';
const ATTRIBUTE_EVENT_NAME = 'event_name';
const ATTRIBUTE_HAS_PRESENTATION_TIME = 'has_presentation_time';
const ATTRIBUTE_LAST_MUTATION = 'last_mutation';

/** The activity windows of DomQuiet, LongFramesQuiet and ElementPaintComplete, as in Datadog RUM page activity. */
const QUIET_WINDOW_MS = 100;

/** Event Timing reports after the paint and drops short events, so InputPaint waits this long after the report list laid out before falling back. */
const INPUT_PAINT_FALLBACK_MS = 1000;

/** Longer than every variant's own wait, so a session never outlives its spans. */
const SESSION_TIMEOUT_MS = 12_000;

const sessions = new Map<string, OpenReportSession>();

function getVariantSpanID(variant: OpenReportSpanVariant, reportID: string) {
    return `${CONST.TELEMETRY.SPAN_OPEN_REPORT}.${variant}_${reportID}`;
}

function startVariantSpan(variant: OpenReportSpanVariant, reportID: string, startTime?: number) {
    startSpan(getVariantSpanID(variant, reportID), {
        name: 'OptionRowLHN',
        op: `${CONST.TELEMETRY.SPAN_OPEN_REPORT}.${variant}`,
        startTime: startTime === undefined ? undefined : performanceTimeToSentrySeconds(startTime),
    });
}

function endVariant(variant: OpenReportSpanVariant, reportID: string, endTime?: number, attributes: Record<string, SpanAttributeValue | undefined> = {}) {
    endSpanWithAttributes(getVariantSpanID(variant, reportID), attributes, endTime);
}

function endQuietVariant(variant: OpenReportSpanVariant, reportID: string, {lastAt, count, hasTimedOut}: QuietWindowResult, attributes: Record<string, SpanAttributeValue | undefined> = {}) {
    endVariant(variant, reportID, lastAt, {[ATTRIBUTE_COUNT]: count, [CONST.TELEMETRY.ATTRIBUTE_TIMED_OUT]: hasTimedOut, ...attributes});
}

type InputEventTiming = {
    /** On the `performance.now()` clock. */
    timeStamp: number;
    type: string;
};

function getInputEventTiming(event: OpenReportInputEvent): InputEventTiming | undefined {
    if (event && 'timeStamp' in event && typeof event.timeStamp === 'number' && typeof event.type === 'string') {
        return {timeStamp: event.timeStamp, type: event.type};
    }
    return undefined;
}

function disposeSession(reportID: string) {
    const session = sessions.get(reportID);
    if (!session) {
        return;
    }
    sessions.delete(reportID);
    for (const cleanup of session.cleanups) {
        cleanup();
    }
    for (const variant of Object.values(OPEN_REPORT_SPAN_VARIANT)) {
        cancelSpan(getVariantSpanID(variant, reportID));
    }
}

function observeInputSignals(reportID: string, session: OpenReportSession, input: InputEventTiming | undefined) {
    if (!input) {
        return;
    }
    const disconnectInputPaint = observeInputPaint(input.timeStamp, input.type, ({paintedAt, eventName, interactionId, hasPresentationTime}) =>
        endVariant(OPEN_REPORT_SPAN_VARIANT.INPUT_PAINT, reportID, paintedAt, {
            [ATTRIBUTE_EVENT_NAME]: eventName,
            [ATTRIBUTE_INTERACTION_ID]: interactionId,
            [ATTRIBUTE_HAS_PRESENTATION_TIME]: hasPresentationTime,
        }),
    );
    if (disconnectInputPaint) {
        startVariantSpan(OPEN_REPORT_SPAN_VARIANT.INPUT_PAINT, reportID);
        session.cleanups.push(disconnectInputPaint);
    }
    if (!isSoftNavigationSupported()) {
        return;
    }
    startVariantSpan(OPEN_REPORT_SPAN_VARIANT.SOFT_NAVIGATION_FIRST_PAINT, reportID);
    startVariantSpan(OPEN_REPORT_SPAN_VARIANT.SOFT_NAVIGATION_LARGEST_PAINT, reportID);
    session.cleanups.push(
        observeSoftNavigation(input.timeStamp, {
            onFirstPaint: (paintedAt) => endVariant(OPEN_REPORT_SPAN_VARIANT.SOFT_NAVIGATION_FIRST_PAINT, reportID, paintedAt),
            onLargestPaint: (result) => endQuietVariant(OPEN_REPORT_SPAN_VARIANT.SOFT_NAVIGATION_LARGEST_PAINT, reportID, result),
        }),
    );
}

function observeDocumentSignals(reportID: string) {
    const session = sessions.get(reportID);
    if (!session) {
        return;
    }
    const disconnectMutations = observeDomMutations((records) => {
        session.domQuiet.record(performance.now());
        const lastRecord = records.at(-1);
        if (lastRecord) {
            session.mutations.last = describeMutation(lastRecord);
        }
        const {listContainer} = session;
        if (listContainer && records.some((record) => Array.from(record.addedNodes).some((node) => node.contains(listContainer)))) {
            endVariant(OPEN_REPORT_SPAN_VARIANT.DOM_INSERTED, reportID);
        }
    });
    if (disconnectMutations) {
        session.cleanups.push(disconnectMutations);
    }

    const longFrames = observeLongAnimationFrames(session.startedAt, (frame) => {
        session.longFramesQuiet.record(frame.endTime);
        const {committedAt} = session;
        if (committedAt === undefined || frame.endTime < committedAt) {
            return;
        }
        endVariant(OPEN_REPORT_SPAN_VARIANT.LONG_FRAME_END, reportID, frame.endTime, {
            [ATTRIBUTE_FRAME_START]: Math.round(frame.startTime),
            [ATTRIBUTE_FRAME_DURATION]: Math.round(frame.endTime - frame.startTime),
            [ATTRIBUTE_BLOCKING_DURATION]: Math.round(frame.blockingDuration),
            [ATTRIBUTE_CONTAINS_COMMIT]: frame.startTime <= committedAt,
        });
    });
    if (longFrames) {
        session.flushers.longFrames = longFrames.flush;
        session.cleanups.push(longFrames.disconnect);
    }
}

const startOpenReportSpanVariants: StartOpenReportSpanVariants = (reportID, event, shouldWaitForHighlight) => {
    disposeSession(reportID);
    const input = getInputEventTiming(event);
    const flushers: OpenReportSession['flushers'] = {};
    const mutations: OpenReportSession['mutations'] = {};
    const session: OpenReportSession = {
        pendingVisualParts: new Set<VisualPart>(shouldWaitForHighlight ? ['report', 'highlight'] : ['report']),
        domQuiet: createQuietWindow(QUIET_WINDOW_MS, (result) => endQuietVariant(OPEN_REPORT_SPAN_VARIANT.DOM_QUIET, reportID, result, {[ATTRIBUTE_LAST_MUTATION]: mutations.last})),
        longFramesQuiet: createQuietWindow(
            QUIET_WINDOW_MS,
            (result) => endQuietVariant(OPEN_REPORT_SPAN_VARIANT.LONG_FRAMES_QUIET, reportID, result),
            () => flushers.longFrames?.(),
        ),
        elementPaintComplete: createQuietWindow(
            QUIET_WINDOW_MS,
            (result) => endQuietVariant(OPEN_REPORT_SPAN_VARIANT.ELEMENT_PAINT_COMPLETE, reportID, result),
            () => flushers.elementPaint?.(),
        ),
        cleanups: [],
        flushers,
        mutations,
        startedAt: input?.timeStamp ?? performance.now(),
    };
    session.cleanups.push(session.domQuiet.stop, session.longFramesQuiet.stop, session.elementPaintComplete.stop);
    const sessionTimeout = setTimeout(() => disposeSession(reportID), SESSION_TIMEOUT_MS);
    session.cleanups.push(() => clearTimeout(sessionTimeout));
    sessions.set(reportID, session);

    startVariantSpan(OPEN_REPORT_SPAN_VARIANT.INPUT_START, reportID, input?.timeStamp);
    for (const variant of [
        OPEN_REPORT_SPAN_VARIANT.COMMIT,
        OPEN_REPORT_SPAN_VARIANT.PASSIVE_EFFECT,
        OPEN_REPORT_SPAN_VARIANT.NEXT_FRAME,
        OPEN_REPORT_SPAN_VARIANT.AFTER_PAINT,
        OPEN_REPORT_SPAN_VARIANT.DOUBLE_FRAME,
        OPEN_REPORT_SPAN_VARIANT.DOM_INSERTED,
        OPEN_REPORT_SPAN_VARIANT.INTERSECTION_VISIBLE,
        OPEN_REPORT_SPAN_VARIANT.ELEMENT_PAINT,
        OPEN_REPORT_SPAN_VARIANT.ELEMENT_PAINT_COMPLETE,
        OPEN_REPORT_SPAN_VARIANT.LONG_FRAME_END,
        OPEN_REPORT_SPAN_VARIANT.VISUALLY_COMPLETE,
        OPEN_REPORT_SPAN_VARIANT.DOM_QUIET,
        OPEN_REPORT_SPAN_VARIANT.LONG_FRAMES_QUIET,
        OPEN_REPORT_SPAN_VARIANT.SETTLED,
        OPEN_REPORT_SPAN_VARIANT.FIRST_IDLE,
    ]) {
        startVariantSpan(variant, reportID);
    }
    observeInputSignals(reportID, session, input);
    observeDocumentSignals(reportID);
};

/** Called from the ref of the probe mounted with the report list, before the layout effects of that commit. */
const attachOpenReportList: AttachOpenReportList = (reportID, probeNode) => {
    const session = sessions.get(reportID);
    const listContainer = probeNode instanceof HTMLElement ? probeNode.parentElement : null;
    if (!session || session.listContainer || !listContainer) {
        return;
    }
    session.listContainer = listContainer;

    const disconnectIntersection = observeIntersection(listContainer, (visibleAt) => endVariant(OPEN_REPORT_SPAN_VARIANT.INTERSECTION_VISIBLE, reportID, visibleAt));
    if (disconnectIntersection) {
        session.cleanups.push(disconnectIntersection);
    }

    let hasPaintedText = false;
    const elementPaint = observeElementPaint(listContainer, getVariantSpanID(OPEN_REPORT_SPAN_VARIANT.ELEMENT_PAINT, reportID), (paintedAt) => {
        session.elementPaintComplete.record(paintedAt);
        if (hasPaintedText) {
            return;
        }
        hasPaintedText = true;
        session.elementPaintComplete.arm(paintedAt);
        endVariant(OPEN_REPORT_SPAN_VARIANT.ELEMENT_PAINT, reportID, paintedAt);
    });
    if (elementPaint) {
        session.flushers.elementPaint = elementPaint.flush;
        session.cleanups.push(elementPaint.disconnect);
    }
};

function markVisualPartLaidOut(reportID: string, part: VisualPart) {
    const pendingParts = sessions.get(reportID)?.pendingVisualParts;
    if (!pendingParts?.delete(part) || pendingParts.size > 0) {
        return;
    }
    endVariant(OPEN_REPORT_SPAN_VARIANT.VISUALLY_COMPLETE, reportID);
}

/** Called from the layout effect of the commit that mounts the report list. */
const markOpenReportListCommitted: MarkOpenReport = (reportID) => {
    const session = sessions.get(reportID);
    if (!session || session.committedAt !== undefined) {
        return;
    }
    session.committedAt = performance.now();
    endVariant(OPEN_REPORT_SPAN_VARIANT.COMMIT, reportID);
    afterNextFrame(() => endVariant(OPEN_REPORT_SPAN_VARIANT.NEXT_FRAME, reportID));
    afterNextPaint(() => endVariant(OPEN_REPORT_SPAN_VARIANT.AFTER_PAINT, reportID));
    afterDoubleFrame(() => endVariant(OPEN_REPORT_SPAN_VARIANT.DOUBLE_FRAME, reportID));
};

/** Called from the passive effect of the commit that mounts the report list. */
const markOpenReportListEffect: MarkOpenReport = (reportID) => {
    endVariant(OPEN_REPORT_SPAN_VARIANT.PASSIVE_EFFECT, reportID);
};

/** Called from the first onLayout of the report list, where ManualOpenReport ends. */
const markOpenReportListLaidOut: MarkOpenReport = (reportID) => {
    const session = sessions.get(reportID);
    if (!session) {
        return;
    }
    const laidOutAt = performance.now();
    endVariant(OPEN_REPORT_SPAN_VARIANT.INPUT_START, reportID);
    markVisualPartLaidOut(reportID, 'report');
    session.domQuiet.arm(laidOutAt);
    session.longFramesQuiet.arm(laidOutAt);

    const inputPaintFallback = setTimeout(() => endVariant(OPEN_REPORT_SPAN_VARIANT.INPUT_PAINT, reportID, laidOutAt, {[ATTRIBUTE_FALLBACK]: true}), INPUT_PAINT_FALLBACK_MS);
    session.cleanups.push(() => clearTimeout(inputPaintFallback));

    waitForResponsiveFrames(({settledAt, longestFrameMs, hasTimedOut}) =>
        endVariant(OPEN_REPORT_SPAN_VARIANT.SETTLED, reportID, settledAt, {
            [CONST.TELEMETRY.ATTRIBUTE_LONGEST_FRAME_MS]: Math.round(longestFrameMs),
            [CONST.TELEMETRY.ATTRIBUTE_TIMED_OUT]: hasTimedOut,
        }),
    );

    const idleCallback = requestIdleCallback(
        (deadline) => endVariant(OPEN_REPORT_SPAN_VARIANT.FIRST_IDLE, reportID, undefined, {[CONST.TELEMETRY.ATTRIBUTE_TIMED_OUT]: deadline.didTimeout}),
        {
            timeout: SESSION_TIMEOUT_MS - INPUT_PAINT_FALLBACK_MS,
        },
    );
    session.cleanups.push(() => cancelIdleCallback(idleCallback));
};

/** Called from the first onLayout of the probe the focused LHN row mounts. */
const markOpenReportHighlightLaidOut: MarkOpenReport = (reportID) => {
    markVisualPartLaidOut(reportID, 'highlight');
};

const cancelOpenReportSpanVariants: MarkOpenReport = (reportID) => {
    disposeSession(reportID);
};

export {
    attachOpenReportList,
    cancelOpenReportSpanVariants,
    markOpenReportHighlightLaidOut,
    markOpenReportListCommitted,
    markOpenReportListEffect,
    markOpenReportListLaidOut,
    startOpenReportSpanVariants,
};
