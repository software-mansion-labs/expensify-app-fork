import {logSchemaProblem} from '@components/DynamicForm/shared';
import type {DynamicFormInputOptions, DynamicFormValues} from '@components/DynamicForm/types';
import type {InputComponentBaseProps} from '@components/Form/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import {isValidSSNFullNine} from '@libs/ValidationUtils';

import type {DynamicFormTextField} from '@src/types/onyx';

/** What a typed answer is checked against, by text and number fields and by HTML inputs */
type FormatRules = Pick<DynamicFormTextField, 'key' | 'regex' | 'minLength' | 'maxLength' | 'example'>;

const MASK_VISIBLE_CHARACTERS = 4;

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

/** All but the last four characters hidden, as in •••-••-6789, so the user can tell which number they entered. A short value shows at most half of itself. */
function maskSensitiveValue(value: string): string {
    const visibleCharacters = Math.min(MASK_VISIBLE_CHARACTERS, Math.floor(value.length / 2));
    const masked = '•'.repeat(value.length - visibleCharacters) + value.slice(value.length - visibleCharacters);
    return isValidSSNFullNine(value) ? `${masked.slice(0, 3)}-${masked.slice(3, 5)}-${masked.slice(5)}` : masked;
}

export {getFormatErrors, getRefreshHandlers, maskSensitiveValue};
export type {FormatRules, RefreshHandlers};
