import type {ValueOf} from 'type-fest';

/** Candidate ways to time a report opened from the LHN on web. Each runs as its own span next to ManualOpenReport, so one session compares them all. */
const OPEN_REPORT_SPAN_VARIANT = {
    /** Starts at the input event's timestamp instead of in onPress, ends where ManualOpenReport does (report list onLayout). */
    INPUT_START: 'InputStart',
    /** Layout effect of the commit that mounts the report list (Shopify marker semantics). */
    COMMIT: 'Commit',
    /** Passive effect of that commit. */
    PASSIVE_EFFECT: 'PassiveEffect',
    /** First animation frame after the commit, before its paint. */
    NEXT_FRAME: 'NextFrame',
    /** A message posted from that frame, delivered after its paint. */
    AFTER_PAINT: 'AfterPaint',
    /** The animation frame after that. */
    DOUBLE_FRAME: 'DoubleFrame',
    /** Event Timing: the paint after the input event's handlers, at its presentation time where Chromium reports it. */
    INPUT_PAINT: 'InputPaint',
    /** MutationObserver: the mutation batch that inserts the report list into the document. */
    DOM_INSERTED: 'DomInserted',
    /** IntersectionObserver: the report list is first visible in the viewport. */
    INTERSECTION_VISIBLE: 'IntersectionVisible',
    /** Element Timing: the first text of the report list on screen. */
    ELEMENT_PAINT: 'ElementPaint',
    /** Element Timing: the last text of the report list on screen before 100 ms without new text paints. */
    ELEMENT_PAINT_COMPLETE: 'ElementPaintComplete',
    /** Long Animation Frames: end of the first long frame that ends after the commit. */
    LONG_FRAME_END: 'LongFrameEnd',
    /** Both the report list and the LHN highlight laid out; the highlight is skipped on narrow layouts. */
    VISUALLY_COMPLETE: 'VisuallyComplete',
    /** MutationObserver: the last DOM mutation before 100 ms without any, armed at the report list onLayout. */
    DOM_QUIET: 'DomQuiet',
    /** Long Animation Frames: the end of the last long frame before 100 ms without any, armed at the report list onLayout. */
    LONG_FRAMES_QUIET: 'LongFramesQuiet',
    /** Animation frames run within budget again after the report list laid out. */
    SETTLED: 'Settled',
    /** requestIdleCallback after the report list laid out. */
    FIRST_IDLE: 'FirstIdle',
    /** Chromium soft navigation heuristics: the first contentful paint after the interaction changed the URL. Only where the browser reports it. */
    SOFT_NAVIGATION_FIRST_PAINT: 'SoftNavigationFirstPaint',
    /** Chromium soft navigation heuristics: the last largest contentful paint candidate of the interaction (500 ms quiet). */
    SOFT_NAVIGATION_LARGEST_PAINT: 'SoftNavigationLargestPaint',
} as const;

type OpenReportSpanVariant = ValueOf<typeof OPEN_REPORT_SPAN_VARIANT>;

export default OPEN_REPORT_SPAN_VARIANT;
export type {OpenReportSpanVariant};
