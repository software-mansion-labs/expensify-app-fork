/**
 * The micro-deposit validation of a pending USD bank account as a DynamicForm schema: one page with the three test transaction amounts.
 * The field keys are the draft keys of the bank account form, and each answer is an amount in major units with a `.` decimal separator.
 */
import type {DynamicFormValues} from '@components/DynamicForm/types';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import CONST from '@src/CONST';
import INPUT_IDS from '@src/types/form/ReimbursementAccountForm';
import type {DynamicFormSchema} from '@src/types/onyx';

const AMOUNT_KEYS = [INPUT_IDS.AMOUNT1, INPUT_IDS.AMOUNT2, INPUT_IDS.AMOUNT3];

function getBankAccountValidationForm(translate: LocalizedTranslate) {
    const label = translate('connectBankAccountStep.validationInputLabel');
    return {
        pages: [
            {
                key: CONST.BANK_ACCOUNT.VALIDATION_STEP.SUB_PAGE_NAMES.AMOUNTS,
                descriptionKey: 'connectBankAccountStep.description',
                content: [
                    {key: 'descriptionCTA', descriptionKey: 'connectBankAccountStep.descriptionCTA'},
                    {key: INPUT_IDS.AMOUNT1, type: 'amount', required: true, label: `${label} 1`},
                    {key: INPUT_IDS.AMOUNT2, type: 'amount', required: true, label: `${label} 2`},
                    {key: INPUT_IDS.AMOUNT3, type: 'amount', required: true, label: `${label} 3`},
                ],
            },
        ],
    } satisfies DynamicFormSchema;
}

/** The amount as the server compares it, without leading zeros or trailing decimal zeros, so `0.10` is sent as `.1`. Empty when it is not a non-zero number. */
function getValidationAmount(answer: DynamicFormValues[string]): string {
    const amount = typeof answer === 'string' ? answer.trim().replaceAll(/^0+|(\.\d*?)0+$/g, '$1') : '';
    return Number(amount) ? amount : '';
}

function getBankAccountValidationErrors(answers: DynamicFormValues, translate: LocalizedTranslate): Record<string, string> {
    const invalidKeys = AMOUNT_KEYS.filter((key) => !getValidationAmount(answers[key]));
    return Object.fromEntries(invalidKeys.map((key) => [key, translate('common.error.invalidAmount')]));
}

/** The three amounts in field order, joined the way BankAccountAPI::validateBankAccount in Web-Expensify reads them */
function getValidateCode(answers: DynamicFormValues): string {
    return AMOUNT_KEYS.map((key) => getValidationAmount(answers[key])).join(',');
}

export default getBankAccountValidationForm;
export {getBankAccountValidationErrors, getValidateCode};
