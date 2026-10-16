import {logSchemaProblem} from '@components/DynamicForm/shared';
import type {DynamicFormInputOptions, DynamicFormValues} from '@components/DynamicForm/types';
import type {InputComponentBaseProps} from '@components/Form/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {DynamicFormTextField} from '@src/types/onyx';

/** What a typed answer is checked against, by text and number fields and by HTML inputs */
type FormatRules = Pick<DynamicFormTextField, 'key' | 'regex' | 'minLength' | 'maxLength' | 'example'>;

/** A regex the schema got wrong accepts every answer, so a broken schema never blocks the user */
function matchesRegex(value: string, pattern: string, fieldKey: string): boolean {
    try {
        return new RegExp(pattern).test(value);
    } catch {
        logSchemaProblem('Invalid regex', {key: fieldKey, regex: pattern});
        return true;
    }
}

/** The format checks every typed answer shares */
function getFormatErrors(rules: FormatRules, value: string, translate: LocalizedTranslate): string[] {
    const messages: string[] = [];
    if (rules.regex && !matchesRegex(value, rules.regex, rules.key)) {
        messages.push(translate('dynamicForm.error.invalidFormat', {example: rules.example}));
    }
    if (rules.minLength !== undefined && value.length < rules.minLength) {
        messages.push(translate('dynamicForm.error.tooShort', {minLength: rules.minLength}));
    }
    if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        messages.push(translate('common.error.characterLimitExceedCounter', value.length, rules.maxLength));
    }
    return messages;
}

type RefreshHandlers = Pick<InputComponentBaseProps, 'onValueChange'> & {
    onBlur?: () => void;
};

type RefreshHandlersOptions = Pick<DynamicFormInputOptions, 'onRefreshRequirements'> & {
    inputID: string;

    /** The schema asks for new requirements when this answer changes */
    shouldRefresh: boolean;

    /** The answer is typed, so it changes on every keystroke */
    isTyped: boolean;

    /** Current answers, which a typed answer is read from when the user leaves the input */
    values: DynamicFormValues;
};

/** A picked answer asks for new requirements as it changes. A typed one asks when the user leaves the input, since it changes on every keystroke. */
function getRefreshHandlers({inputID, shouldRefresh, isTyped, values, onRefreshRequirements}: RefreshHandlersOptions): RefreshHandlers {
    if (!shouldRefresh || !onRefreshRequirements) {
        return {};
    }
    if (!isTyped) {
        return {onValueChange: (value, key) => onRefreshRequirements(key, value)};
    }
    return {
        onBlur: () => {
            const value = values[inputID];
            if (value !== undefined) {
                onRefreshRequirements(inputID, value);
            }
        },
    };
}

export {getFormatErrors, getRefreshHandlers};
export type {FormatRules, RefreshHandlers};
