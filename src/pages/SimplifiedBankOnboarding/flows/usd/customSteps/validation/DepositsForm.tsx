/**
 * The test deposit form of the last USD step. It sends the three amounts itself and does not move on: a right answer
 * changes the bank account state, which swaps this form for the connected screen, and a wrong one shows the error or,
 * after too many tries, the block message.
 */
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';
import FormHelpMessage from '@components/FormHelpMessage';
import Text from '@components/Text';
import TextInput from '@components/TextInput';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import type {ACHData} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import getBankAccountParams from '@pages/SimplifiedBankOnboarding/flows/shared/getBankAccountParams';
import type {CustomStepProps} from '@pages/SimplifiedBankOnboarding/flows/shared/plan/types';
import validateBankAccount from '@pages/SimplifiedBankOnboarding/flows/usd/requests/validateBankAccount';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';
import {View} from 'react-native';

type AmountInputID = typeof INPUT_IDS.AMOUNT_1 | typeof INPUT_IDS.AMOUNT_2 | typeof INPUT_IDS.AMOUNT_3;

type DepositsFormValues = FormOnyxValues<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>;

type DepositsFormProps = Pick<CustomStepProps, 'policyID' | 'isSubmitting' | 'errorText'> & {
    achData: ACHData | undefined;
};

const AMOUNT_INPUT_IDS: AmountInputID[] = [INPUT_IDS.AMOUNT_1, INPUT_IDS.AMOUNT_2, INPUT_IDS.AMOUNT_3];

function isValidAmount(amount: string | undefined): boolean {
    const trimmedAmount = amount?.trim() ?? '';
    return trimmedAmount !== '' && !Number.isNaN(Number(trimmedAmount)) && Number(trimmedAmount) > 0;
}

function DepositsForm({policyID, achData, isSubmitting, errorText}: DepositsFormProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();

    const validate = (values: DepositsFormValues): FormInputErrors<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM> => {
        const errors: FormInputErrors<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM> = {};
        for (const inputID of AMOUNT_INPUT_IDS) {
            if (!isValidAmount(values[inputID])) {
                errors[inputID] = translate('common.error.invalidAmount');
            }
        }
        return errors;
    };

    const submit = (values: DepositsFormValues) => {
        const amounts = AMOUNT_INPUT_IDS.map((inputID) => values[inputID]?.trim() ?? '');
        validateBankAccount(getBankAccountParams(policyID, achData), amounts);
    };

    return (
        <FormProvider
            formID={ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM}
            submitButtonText={translate('connectBankAccountStep.validateButtonText')}
            onSubmit={submit}
            validate={validate}
            style={[styles.mh5, styles.flexGrow1]}
            isLoading={isSubmitting}
            sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SUBMIT_STEP}
        >
            <Text>{translate('connectBankAccountStep.description')}</Text>
            <Text style={[styles.textSupporting, styles.mt3]}>{`The mock server expects ${SBO_CONST.MOCK.MICRO_DEPOSIT_AMOUNTS.join(', ')}.`}</Text>
            <View style={styles.mv5}>
                {AMOUNT_INPUT_IDS.map((inputID, index) => (
                    <InputWrapper
                        key={inputID}
                        InputComponent={TextInput}
                        inputID={inputID}
                        shouldSaveDraft
                        containerStyles={styles.mb6}
                        inputMode={CONST.INPUT_MODE.DECIMAL}
                        label={`${translate('connectBankAccountStep.validationInputLabel')} ${index + 1}`}
                        aria-label={`${translate('connectBankAccountStep.validationInputLabel')} ${index + 1}`}
                        role={CONST.ROLE.PRESENTATION}
                        maxLength={CONST.VALIDATION_REIMBURSEMENT_INPUT_LIMIT}
                        sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.EDIT_INPUT}
                    />
                ))}
            </View>
            <FormHelpMessage message={errorText} />
        </FormProvider>
    );
}

export default DepositsForm;
