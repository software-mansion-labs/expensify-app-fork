import type {DynamicFormValues} from '@components/DynamicForm/types';

import {forgetSensitiveAnswers, saveSensitiveAnswers} from '@userActions/DynamicForm';

import type {OnyxFormKey} from '@src/ONYXKEYS';

function saveSensitiveAnswersIfAny(formID: OnyxFormKey, answers: DynamicFormValues) {
    if (Object.keys(answers).length === 0) {
        return;
    }
    saveSensitiveAnswers(formID, answers);
}

function forgetSensitiveAnswersIfAny(formID: OnyxFormKey, keys: string[]) {
    if (keys.length === 0) {
        return;
    }
    forgetSensitiveAnswers(formID, keys);
}

export {forgetSensitiveAnswersIfAny, saveSensitiveAnswersIfAny};
