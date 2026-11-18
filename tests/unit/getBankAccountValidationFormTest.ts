import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import getBankAccountValidationForm, {getBankAccountValidationErrors, getValidateCode} from '@pages/ReimbursementAccount/USD/ConnectBankAccount/getBankAccountValidationForm';

import INPUT_IDS from '@src/types/form/ReimbursementAccountForm';

const translate: LocalizedTranslate = (path, ...parameters) => (parameters.length > 0 ? `${path}:${parameters.length}` : path);

function getAnswers(amount1: string, amount2: string, amount3: string) {
    return {[INPUT_IDS.AMOUNT1]: amount1, [INPUT_IDS.AMOUNT2]: amount2, [INPUT_IDS.AMOUNT3]: amount3};
}

describe('getBankAccountValidationForm', () => {
    it('asks for the three amounts in the order the code joins them', () => {
        // Given the form the validation step shows

        // When its fields are read
        const [page] = getBankAccountValidationForm(translate).pages;
        const fields = page.content.filter((item) => 'type' in item);

        // Then the amounts come in field order with numbered labels, so the user matches each one to a transaction
        expect(fields.map((field) => [field.key, field.label])).toEqual([
            [INPUT_IDS.AMOUNT1, 'connectBankAccountStep.validationInputLabel 1'],
            [INPUT_IDS.AMOUNT2, 'connectBankAccountStep.validationInputLabel 2'],
            [INPUT_IDS.AMOUNT3, 'connectBankAccountStep.validationInputLabel 3'],
        ]);
    });

    it('rejects a zero amount', () => {
        // Given a zero typed with decimals next to two real amounts
        const answers = getAnswers('0.00', '1.23', '2');

        // When the page is validated
        const errors = getBankAccountValidationErrors(answers, translate);

        // Then only the zero is marked, since no test transaction is for nothing
        expect(errors).toEqual({[INPUT_IDS.AMOUNT1]: 'common.error.invalidAmount'});
    });

    it('builds the code the server has always received', () => {
        // Given amounts with leading zeros and trailing decimal zeros
        const answers = getAnswers('0.01', '1.20', '2');

        // When the validate code is built
        const code = getValidateCode(answers);

        // Then the zeros are dropped as the form did before it moved to the dynamic form, so the API contract does not change
        expect(code).toBe('.01,1.2,2');
    });
});
