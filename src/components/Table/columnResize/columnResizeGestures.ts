/** Turns pointer travel and key presses on a column's edge into a column width, kept within the drag bounds. */
import CONST from '@src/CONST';

/** What a key pressed on a focused column edge does. Arrows move the edge, Enter and Space stand in for click and double-click. */
type KeyboardResizeAction = {type: 'step'; step: number} | {type: 'toggleFit'};

function clampColumnWidth(width: number, minWidth: number = CONST.TABLES.COLUMN_RESIZE.MIN_WIDTH): number {
    return Math.min(Math.max(Math.round(width), minWidth), CONST.TABLES.COLUMN_RESIZE.MAX_WIDTH);
}

/** Whether the pointer travelled far enough to mean a drag. A mouse click rarely lands on the exact pixel it started from. */
function hasPointerPassedDragSlop(startClientX: number, clientX: number): boolean {
    return Math.abs(clientX - startClientX) > CONST.TABLES.COLUMN_RESIZE.DRAG_SLOP;
}

/** The width a drag puts the column at: its start width plus the pointer's travel, within the drag bounds. */
function getDraggedColumnWidth(startWidth: number, startClientX: number, clientX: number, minWidth: number = CONST.TABLES.COLUMN_RESIZE.MIN_WIDTH): number {
    return clampColumnWidth(startWidth + (clientX - startClientX), minWidth);
}

/** `undefined` for keys a column edge leaves alone. */
function getKeyboardResizeAction({key, code}: Pick<KeyboardEvent, 'key' | 'code'>): KeyboardResizeAction | undefined {
    if (key === CONST.KEYBOARD_SHORTCUTS.ARROW_LEFT.shortcutKey) {
        return {type: 'step', step: -CONST.TABLES.COLUMN_RESIZE.KEYBOARD_STEP};
    }

    if (key === CONST.KEYBOARD_SHORTCUTS.ARROW_RIGHT.shortcutKey) {
        return {type: 'step', step: CONST.TABLES.COLUMN_RESIZE.KEYBOARD_STEP};
    }

    const isEnter = key === CONST.KEYBOARD_SHORTCUTS.ENTER.shortcutKey;
    const isSpace = code === CONST.KEYBOARD_SHORTCUTS.SPACE.shortcutKey && key === CONST.KEYBOARD_SHORTCUTS.SPACE.trigger.DEFAULT.input;

    if (isEnter || isSpace) {
        return {type: 'toggleFit'};
    }

    return undefined;
}

export default getDraggedColumnWidth;
export {clampColumnWidth, getKeyboardResizeAction, hasPointerPassedDragSlop};
export type {KeyboardResizeAction};
