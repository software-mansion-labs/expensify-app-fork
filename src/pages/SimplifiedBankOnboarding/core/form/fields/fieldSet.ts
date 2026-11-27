/**
 * What the form page, the plan and the controller ask of the fields of a page as a whole. They never look inside a
 * field, so everything they need from a page goes through these helpers.
 */
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {InputID, OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {OnboardingFormErrors} from '@pages/SimplifiedBankOnboarding/contract/formID';

import {isEmptyObject} from '@src/types/utils/EmptyObject';

import type {Field} from './types';

function validateFields(fields: Field[], values: OnboardingDraft, translate: LocalizedTranslate): OnboardingFormErrors {
    const errors: OnboardingFormErrors = {};
    for (const field of fields) {
        Object.assign(errors, field.getErrors(values, translate));
    }
    return errors;
}

/** The answers already pass the rules of every field, so the flow can resume after the page */
function areFieldsComplete(fields: Field[], values: OnboardingDraft, translate: LocalizedTranslate): boolean {
    return isEmptyObject(validateFields(fields, values, translate));
}

/** The form holds the whole draft, so a page submits only the values of its own inputs, and none that the server holds */
function getFieldValues(fields: Field[], values: OnboardingDraft): OnboardingDraft {
    const fieldValues: OnboardingDraft = {};

    // A generic key keeps the value type of the input, which a union of input IDs would lose
    const copyValue = <TID extends InputID>(inputID: TID) => {
        fieldValues[inputID] = values[inputID];
    };

    for (const inputID of fields.filter((field) => !field.isHeldByServer).flatMap((field) => field.inputIDs)) {
        copyValue(inputID);
    }
    return fieldValues;
}

/**
 * The inputs that the draft drops once the server saved them, so the answers come from the server again and an old draft
 * value never hides a newer server value
 */
function getInputIDsToClear(fields: Field[]): InputID[] {
    return fields.filter((field) => !field.shouldKeepInDraft).flatMap((field) => field.inputIDs);
}

export {areFieldsComplete, getFieldValues, getInputIDsToClear, validateFields};
