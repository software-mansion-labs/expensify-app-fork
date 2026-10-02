import {
    RESIZE_GRIP_OPACITY_VARIABLE,
    RESIZE_INDICATOR_HEIGHT_VARIABLE,
    RESIZE_INDICATOR_OPACITY_VARIABLE,
    RESIZE_INDICATOR_SELECTOR,
    RESIZE_INDICATOR_TOP_VARIABLE,
    TABLE_ROW_SELECTOR,
} from '@components/Table/columnResize/columnWidthExpressions';

import CONST from '@src/CONST';

import type {RefObject} from 'react';

import {useRef} from 'react';

const {GRIP_HEIGHT, INDICATOR_MORPH_DURATION} = CONST.TABLES.COLUMN_RESIZE;

/** What the indicator's and the grip's opacity properties are set to. */
const INDICATOR_OPACITY = {
    VISIBLE: '1',
    HIDDEN: '0',
} as const;

type ResizeIndicator = {
    /** Shows the line at the given handle, hiding the one at any other handle. */
    revealIndicator: (handleElement: HTMLElement) => void;

    /** Hides the line, unless a drag is still carrying it. */
    hideIndicator: () => void;

    /** Shows the grip on the given handle, for while the pointer is over its column's heading. */
    showGrip: (handleElement: HTMLElement) => void;

    /** Hides the grip on the given handle again. */
    hideGrip: (handleElement: HTMLElement) => void;
};

/**
 * Shows the handle's line, running from its heading row's top to the lowest row's bottom, grown out of the grip so the
 * grip reads as turning into the line. Measured once per reveal: the line sits in the handle, so drags and sideways
 * scrolls carry it along, and the scroller clips whatever runs past the rows.
 */
function drawIndicatorAtHandle(scopeElement: HTMLElement | null, handleElement: HTMLElement) {
    const handleRect = handleElement.getBoundingClientRect();
    const headerRowTop = (handleElement.closest(TABLE_ROW_SELECTOR) ?? handleElement).getBoundingClientRect().top;
    let lowestRowBottom = handleRect.bottom;

    for (const row of scopeElement?.querySelectorAll(TABLE_ROW_SELECTOR) ?? []) {
        // The hidden twins a virtualized list keeps around aren't where a row is drawn. Only hiding within the table
        // counts: a modal hiding the whole screen from assistive tech hides every row and leaves them all drawn.
        const hiddenAncestor = row.closest('[aria-hidden="true"]');

        if (hiddenAncestor && scopeElement?.contains(hiddenAncestor)) {
            continue;
        }

        lowestRowBottom = Math.max(lowestRowBottom, row.getBoundingClientRect().bottom);
    }

    const indicatorHeight = lowestRowBottom - headerRowTop;

    handleElement.style.setProperty(RESIZE_INDICATOR_TOP_VARIABLE, `${headerRowTop - handleRect.top}px`);
    handleElement.style.setProperty(RESIZE_INDICATOR_HEIGHT_VARIABLE, `${indicatorHeight}px`);
    handleElement.style.setProperty(RESIZE_INDICATOR_OPACITY_VARIABLE, INDICATOR_OPACITY.VISIBLE);

    // The grip is centred on the handle, so the line starts clipped to exactly the grip's box and opens up from there.
    const gripTop = handleRect.top + handleRect.height / 2 - headerRowTop - GRIP_HEIGHT / 2;
    const gripBottom = indicatorHeight - gripTop - GRIP_HEIGHT;

    // `animate` is missing outside browsers, e.g. under jsdom.
    handleElement.querySelector<HTMLElement>(RESIZE_INDICATOR_SELECTOR)?.animate?.([{clipPath: `inset(${gripTop}px 0 ${gripBottom}px 0)`}, {clipPath: 'inset(0 0 0 0)'}], {
        duration: INDICATOR_MORPH_DURATION,
        easing: 'ease-out',
    });
}

/** The column edge line and the grips, toggled through custom properties on each handle so hovering never re-renders the table. */
function useResizeIndicator(scopeElementRef: RefObject<HTMLElement | null>, dragRef: RefObject<unknown>): ResizeIndicator {
    // The handle whose line is showing, so a drag ending away from it can still hide it.
    const activeHandleElementRef = useRef<HTMLElement | null>(null);

    // The handle whose column heading the pointer is over.
    const hoveredHandleElementRef = useRef<HTMLElement | null>(null);

    /** A grip shows while its heading is hovered, except while its line is showing, which it has turned into. */
    const syncGrip = (handleElement: HTMLElement | null) => {
        const isGripVisible = handleElement === hoveredHandleElementRef.current && handleElement !== activeHandleElementRef.current;

        handleElement?.style.setProperty(RESIZE_GRIP_OPACITY_VARIABLE, isGripVisible ? INDICATOR_OPACITY.VISIBLE : INDICATOR_OPACITY.HIDDEN);
    };

    const revealIndicator = (handleElement: HTMLElement) => {
        if (activeHandleElementRef.current === handleElement) {
            return;
        }

        const previousHandleElement = activeHandleElementRef.current;

        previousHandleElement?.style.setProperty(RESIZE_INDICATOR_OPACITY_VARIABLE, INDICATOR_OPACITY.HIDDEN);
        activeHandleElementRef.current = handleElement;
        syncGrip(previousHandleElement);
        syncGrip(handleElement);
        drawIndicatorAtHandle(scopeElementRef.current, handleElement);
    };

    const hideIndicator = () => {
        // A drag that has left the handle behind still shows where the edge is going.
        if (dragRef.current) {
            return;
        }

        const previousHandleElement = activeHandleElementRef.current;

        previousHandleElement?.style.setProperty(RESIZE_INDICATOR_OPACITY_VARIABLE, INDICATOR_OPACITY.HIDDEN);
        activeHandleElementRef.current = null;
        syncGrip(previousHandleElement);
    };

    const showGrip = (handleElement: HTMLElement) => {
        hoveredHandleElementRef.current = handleElement;
        syncGrip(handleElement);
    };

    const hideGrip = (handleElement: HTMLElement) => {
        if (hoveredHandleElementRef.current === handleElement) {
            hoveredHandleElementRef.current = null;
        }

        syncGrip(handleElement);
    };

    return {revealIndicator, hideIndicator, showGrip, hideGrip};
}

export default useResizeIndicator;
