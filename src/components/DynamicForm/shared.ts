import type {FormValue} from '@components/Form/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import {addErrorMessage} from '@libs/ErrorUtils';
import Log from '@libs/Log';

import type {TranslationPaths} from '@src/languages/types';
import type {DynamicFormCondition, DynamicFormField, DynamicFormListItem} from '@src/types/onyx';

import type {DynamicFormError, DynamicFormValues} from './types';

/** A schema problem repeats on every render and validation, so each one is logged once per session */
const loggedProblems = new Set<string>();

function logSchemaProblem(message: string, parameters: Record<string, string>) {
    const problemID = `${message}:${JSON.stringify(parameters)}`;
    if (loggedProblems.has(problemID)) {
        return;
    }
    loggedProblems.add(problemID);
    Log.warn(`[DynamicForm] ${message}`, parameters);
}

/** Our translation when the schema names one, otherwise the schema author's wording */
function getLocalizedText(translate: LocalizedTranslate, translationKey: TranslationPaths | undefined, text: string | undefined): string | undefined {
    return translationKey ? translate(translationKey) : text;
}

function hasText(text: unknown): text is string {
    return typeof text === 'string' && text !== '';
}

/** A checkbox that is not ticked is unanswered. `isNoAnAnswer` is for a boolean asked as a Yes/No question, where No answers it. */
function isAnswered(value: FormValue | undefined, isNoAnAnswer = false): boolean {
    if (typeof value === 'boolean') {
        return value || isNoAnAnswer;
    }
    if (typeof value === 'string') {
        return value.trim() !== '';
    }
    if (Array.isArray(value)) {
        return value.length > 0;
    }
    return value instanceof Date;
}

function isListItem(value: unknown): value is DynamicFormListItem {
    return typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'string';
}

function isFormValue(value: unknown): value is FormValue {
    if (typeof value === 'string' || typeof value === 'boolean' || value instanceof Date) {
        return true;
    }
    if (!Array.isArray(value)) {
        return false;
    }
    const items: unknown[] = value;
    return (
        items.every((item) => typeof item === 'string') ||
        items.every((item) => typeof item === 'boolean') ||
        items.every((item) => typeof item === 'object' && item !== null && ('name' in item || 'uri' in item)) ||
        items.every(isListItem)
    );
}

/** The answers in a form draft or a FormProvider submission. A dynamic form's keys come from the schema, so its Onyx type cannot list them. */
function toDynamicFormValues(formValues: unknown): DynamicFormValues {
    if (typeof formValues !== 'object' || formValues === null) {
        return {};
    }
    return Object.fromEntries(Object.entries(formValues).filter(([, value]) => isFormValue(value)));
}

/** Errors in the shape FormProvider's `validate` returns. Messages for the same input are joined, one per line. */
function toFormErrors(errors: DynamicFormError[]): Record<string, string> {
    const formErrors: Record<string, string> = {};
    for (const [inputID, message] of errors) {
        addErrorMessage(formErrors, inputID, message);
    }
    return formErrors;
}

/** Whether the answer to a `showWhen` controller is one the condition lists. A list answer matches when any chosen value is listed. */
function matchesCondition(controllingValue: DynamicFormValues[string], equals: string[]): boolean {
    if (Array.isArray(controllingValue)) {
        const chosenValues: unknown[] = controllingValue;
        return chosenValues.some((chosenValue) => typeof chosenValue === 'string' && equals.includes(chosenValue));
    }
    if (typeof controllingValue !== 'string' && typeof controllingValue !== 'boolean') {
        return false;
    }
    return equals.includes(String(controllingValue));
}

/** `checkedControllers` holds the controllers already followed, so a cycle of conditions ends */
function isShownWithin(condition: DynamicFormCondition | undefined, values: DynamicFormValues, controllers: DynamicFormField[], checkedControllers: Set<DynamicFormField>): boolean {
    if (!condition) {
        return true;
    }
    const controller = controllers.find((candidate) => candidate.key === condition.key);
    if (controller && !checkedControllers.has(controller) && !isShownWithin(controller.showWhen, values, controllers, new Set([...checkedControllers, controller]))) {
        return false;
    }
    return matchesCondition(values[condition.key], condition.equals);
}

/**
 * Whether something with this `showWhen` is shown: a field, a heading or a page. It stays hidden while its controller is hidden, so an answer left on a hidden field cannot reveal its dependents.
 * `controllers` are the fields a condition can name, which is the whole form when the condition sits on one page of it.
 */
function isShown(condition: DynamicFormCondition | undefined, values: DynamicFormValues, controllers: DynamicFormField[]): boolean {
    return isShownWithin(condition, values, controllers, new Set());
}

export {getLocalizedText, hasText, isAnswered, isListItem, isShown, logSchemaProblem, toDynamicFormValues, toFormErrors};
