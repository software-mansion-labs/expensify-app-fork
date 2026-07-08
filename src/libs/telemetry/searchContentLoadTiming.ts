import CONST from '@src/CONST';

import type {SpanAttributes} from '@sentry/core';

import {spanToJSON} from '@sentry/core';

import {getSpan} from './activeSpans';

type ContentLoadClaim = {
    /** The ContentLoad span instance owned by the claiming search request */
    span: NonNullable<ReturnType<typeof getSpan>>;
    /** Hash of the search query that owns the span */
    hash: number;
};

let claim: ContentLoadClaim | undefined;

/**
 * Claims the active NavigateToReportsContentLoad span for the search request identified by `hash`.
 * Only the first search that runs while the span is active becomes its owner, so overlapping searches
 * (e.g. a recount with a different hash) cannot mix timings from two requests on one span. Also stamps
 * the time elapsed from span start to the search call, which separates the pre-search mount/effects
 * phase from the post-data render phase when slicing the span duration.
 */
function claimSearchContentLoadSpan(hash: number) {
    const span = getSpan(CONST.TELEMETRY.SPAN_NAVIGATE_TO_REPORTS_CONTENT_LOAD);
    if (!span || claim?.span === span) {
        return;
    }
    claim = {span, hash};
    const spanStartTimestamp = spanToJSON(span).start_timestamp;
    span.setAttribute(CONST.TELEMETRY.ATTRIBUTE_SEARCH_CALL_OFFSET_MS, Math.max(0, Math.round(Date.now() - spanStartTimestamp * 1000)));
}

/**
 * Whether the search identified by `hash` owns a ContentLoad span that is still active
 * (not ended and not replaced by a newer navigation).
 */
function ownsActiveSearchContentLoadSpan(hash: number): boolean {
    return claim?.hash === hash && getSpan(CONST.TELEMETRY.SPAN_NAVIGATE_TO_REPORTS_CONTENT_LOAD) === claim.span;
}

/**
 * Stamps attributes on the ContentLoad span when the search identified by `hash` owns it and the span
 * is still active. No-op otherwise, so late responses from a previous navigation and responses of
 * non-owning searches cannot pollute the span.
 */
function stampSearchContentLoadAttributes(hash: number, attributes: SpanAttributes) {
    if (!ownsActiveSearchContentLoadSpan(hash)) {
        return;
    }
    claim?.span.setAttributes(attributes);
}

export {claimSearchContentLoadSpan, ownsActiveSearchContentLoadSpan, stampSearchContentLoadAttributes};
