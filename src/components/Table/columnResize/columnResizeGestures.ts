import CONST from '@src/CONST';

const {MIN_WIDTH, MAX_WIDTH, KEYBOARD_STEP, DRAG_SLOP} = CONST.TABLES.COLUMN_RESIZE;

/** What a key pressed on a column's edge does. */
type KeyboardResizeAction = {type: 'step'; step: number} | {type: 'toggleFit'};

/** How far each arrow key moves a column's edge. Other keys leave the column alone. */
const KEYBOARD_STEP_BY_KEY: Record<string, number> = {
    ArrowLeft: -KEYBOARD_STEP,
    ArrowRight: KEYBOARD_STEP,
};

/** Keys that fit a column to its content and release it again, standing in for the pointer's click and double-click. */
const FIT_TO_CONTENT_KEYS = new Set([' ', 'Enter']);

function clampColumnWidth(width: number): number {
    return Math.min(Math.max(Math.round(width), MIN_WIDTH), MAX_WIDTH);
}

/** Whether the pointer has travelled far enough from where it went down to mean a drag, since a click rarely lands on exactly one pixel. */
function hasPointerPassedDragSlop(startClientX: number, clientX: number): boolean {
    return Math.abs(clientX - startClientX) > DRAG_SLOP;
}

/** The width a drag puts the column at: its start width plus the pointer's travel, within the drag bounds. */
function getDraggedColumnWidth(startWidth: number, startClientX: number, clientX: number): number {
    return clampColumnWidth(startWidth + (clientX - startClientX));
}

function getKeyboardResizeAction(key: string): KeyboardResizeAction | undefined {
    if (FIT_TO_CONTENT_KEYS.has(key)) {
        return {type: 'toggleFit'};
    }

    const step = KEYBOARD_STEP_BY_KEY[key];

    return step === undefined ? undefined : {type: 'step', step};
}

/** Whether the keyboard toggle fits the column to its content or releases it: it fits unless the column is already at its content width. */
function getToggleFitAction(contentWidth: number | undefined, storedWidth: number | undefined): 'fit' | 'release' {
    if (contentWidth !== undefined && storedWidth !== clampColumnWidth(contentWidth)) {
        return 'fit';
    }

    return 'release';
}

export {clampColumnWidth, getDraggedColumnWidth, getKeyboardResizeAction, getToggleFitAction, hasPointerPassedDragSlop};
export type {KeyboardResizeAction};
