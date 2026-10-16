import {logSchemaProblem} from '@components/DynamicForm/shared';
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

export default getFormatErrors;
export type {FormatRules};
