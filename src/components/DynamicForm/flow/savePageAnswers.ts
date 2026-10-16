import type {DynamicFormValues} from '@components/DynamicForm/types';

import {saveDraftAnswers} from '@userActions/DynamicForm';

import type {OnyxFormKey} from '@src/ONYXKEYS';
import type {DynamicFormField} from '@src/types/onyx';

import type {DynamicFormFlowPage} from './types';

import {forgetSensitiveAnswersIfAny, saveSensitiveAnswersIfAny} from './shared/sensitiveAnswers';
import splitPageAnswers from './splitPageAnswers';

/**
 * Saves the answers of a page the user leaves with Next and returns the ones the screen may get. Typed answers are drafted as FormProvider cleaned them, and inputs left untouched
 * are drafted with their defaults, so the draft matches what the page validated. Sensitive answers go to memory only. Lists are drafted as they change, so the screen gets their entries,
 * which hold no sensitive answers.
 */
function savePageAnswers(formID: OnyxFormKey, page: DynamicFormFlowPage, values: DynamicFormValues, allFields: DynamicFormField[]): DynamicFormValues {
    const {draftAnswers, listAnswers, sensitiveAnswers, removedSensitiveKeys} = splitPageAnswers(page, values, allFields);
    saveDraftAnswers(formID, draftAnswers);
    saveSensitiveAnswersIfAny(formID, sensitiveAnswers);
    forgetSensitiveAnswersIfAny(formID, removedSensitiveKeys);
    return {...draftAnswers, ...listAnswers};
}

export default savePageAnswers;
