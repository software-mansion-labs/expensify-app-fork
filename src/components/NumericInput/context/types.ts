import type {NumericEditingKeyPressEvent, NumericEditingSelection} from '@components/NumericEditingController/types';
import type {BaseTextInputRef} from '@components/TextInput/BaseTextInput/types';

import type {RefObject} from 'react';

type NumericInputStateContextValue = {
    /** The canonical signed value owned by the root. */
    value: string;

    /** Canonical value rendered with locale digits. */
    formattedNumber: string;

    /** Selection clamped to the displayed text. */
    selection: NumericEditingSelection;

    /** Whether the canonical value is negative. */
    isNegative: boolean;

    /** Whether negative values are allowed. */
    allowNegative: boolean;

    /** Error supplied by FormProvider. Rendered by the `NumericInput.Error` primitive wherever the composition places it. */
    errorText?: string;

    /** Underlying text input, filled in by the text input primitive and read by focus handling and the web caret sync. */
    inputRef: RefObject<BaseTextInputRef | null>;
};

type NumericInputActionsContextValue = {
    /** Normalizes, validates, and commits displayed text. */
    setNumber: (text: string) => void;

    /** Replaces the selection with `text`, the way typing does. Used by the number pad keys. */
    insertAtCaret: (text: string) => void;

    /** Removes the selection or the character before the caret, and a hidden sign when the caret is at the start. Used by the number pad backspace. */
    deleteBackward: () => void;

    /** Starts a held backspace, which deletes on a timer while native selection events are dropped. */
    beginRepeatedDelete: () => void;

    /** Ends a held backspace, so native selection events apply again. */
    endRepeatedDelete: () => void;

    /** Places the caret at the selection end, clearing any highlighted range. */
    clearSelection: () => void;

    /** Toggles the sign of the canonical value and notifies the parent. */
    toggleSign: () => void;

    /** Applies a native selection change, dropping stale events from manual updates. */
    handleSelectionChange: (selectionStart: number, selectionEnd: number) => void;

    /** Tracks forward-delete key presses for caret positioning, and removes the sign on a backspace at the start. */
    handleKeyPress: (event: NumericEditingKeyPressEvent) => void;

    /** Focuses the underlying text input. */
    focusInput: () => void;
};

export type {NumericInputActionsContextValue, NumericInputStateContextValue};
