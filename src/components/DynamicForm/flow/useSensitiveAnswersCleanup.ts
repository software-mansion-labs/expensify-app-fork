import {clearSensitiveAnswers} from '@userActions/DynamicForm';

import type {OnyxFormKey} from '@src/ONYXKEYS';

import {useEffect, useRef} from 'react';

type SensitiveAnswersCleanupOptions = {
    formID: OnyxFormKey;

    /** useSubPage is sending a visit opened without a page in the URL to its start page */
    isRedirecting: boolean;

    isSubmitting: boolean | undefined;

    submitError: string | undefined;
};

/** Drops the sensitive answers kept in memory when a new visit starts and when a submission finishes without an error */
function useSensitiveAnswersCleanup({formID, isRedirecting, isSubmitting, submitError}: SensitiveAnswersCleanupOptions) {
    useEffect(() => {
        if (!isRedirecting) {
            return;
        }
        clearSensitiveAnswers(formID);
    }, [isRedirecting, formID]);

    const wasSubmittingRef = useRef(false);
    useEffect(() => {
        if (isSubmitting) {
            wasSubmittingRef.current = true;
            return;
        }
        if (!wasSubmittingRef.current || submitError) {
            return;
        }
        wasSubmittingRef.current = false;
        clearSensitiveAnswers(formID);
    }, [isSubmitting, submitError, formID]);
}

export default useSensitiveAnswersCleanup;
