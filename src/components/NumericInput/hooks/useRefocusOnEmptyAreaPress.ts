import {useNumericInputActions} from '@components/NumericInput/context';

import isHTMLElement from '@libs/isHTMLElement';

import type {MouseEvent} from 'react';

import {useId} from 'react';

/**
 * Keeps the numeric input focused when a web press lands on an empty area instead of letting the browser blur it.
 * Spread `onMouseDown` on the view that owns the area. A press on that view itself, or on a nested view given `id`,
 * refocuses the input with a collapsed caret. Presses bubbling up from other children keep their selection.
 */
function useRefocusOnEmptyAreaPress() {
    const {clearSelection, focusInput} = useNumericInputActions();
    const id = useId();

    const onMouseDown = (event: MouseEvent<Element>) => {
        const target = event.nativeEvent?.target;
        if (!isHTMLElement(target) || (target !== event.currentTarget && target.id !== id)) {
            return;
        }

        event.preventDefault();
        clearSelection();
        focusInput();
    };

    return {id, onMouseDown};
}

export default useRefocusOnEmptyAreaPress;
