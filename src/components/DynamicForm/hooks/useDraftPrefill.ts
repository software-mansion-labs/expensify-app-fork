import type {DynamicFormValues} from '@components/DynamicForm/types';
import getMissingDraftAnswers from '@components/DynamicForm/utils/getMissingDraftAnswers';
import toDynamicFormValues from '@components/DynamicForm/utils/toDynamicFormValues';

import useOnyx from '@hooks/useOnyx';

import {saveDraftAnswers} from '@userActions/DynamicForm';

import type {OnyxFormKey} from '@src/ONYXKEYS';
import {isEmptyObject} from '@src/types/utils/EmptyObject';

import {useEffect} from 'react';

/**
 * Copies the answers a screen already knows, such as the ones saved to the server, into the form draft.
 * DynamicFormFlow reads its answers and picks its first page from the draft, so the screen shows a loader instead of the flow while this returns true.
 */
function useDraftPrefill(formID: OnyxFormKey, prefill: DynamicFormValues, readonlyKeys?: ReadonlySet<string>): boolean {
    const [draft] = useOnyx(`${formID}Draft`);
    const missingPrefill = getMissingDraftAnswers(prefill, toDynamicFormValues(draft), readonlyKeys);
    const isPrefillPending = !isEmptyObject(missingPrefill);

    useEffect(() => {
        if (!isPrefillPending) {
            return;
        }
        saveDraftAnswers(formID, missingPrefill);
    }, [formID, isPrefillPending, missingPrefill]);

    return isPrefillPending;
}

export default useDraftPrefill;
