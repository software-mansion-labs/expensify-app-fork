/**
 * The test deposit form of the last USD step. Like the real form it sends the three amounts and does not wait for the
 * answer to move on: a right answer changes the bank account state, which swaps this form for the next screen. The form
 * follows its request by its own ID only to show the loader and the error of a wrong answer, or after too many tries the
 * block message.
 */
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import type {FormInputErrors, FormOnyxValues} from '@components/Form/types';
import FormHelpMessage from '@components/FormHelpMessage';
import Text from '@components/Text';
import TextInput from '@components/TextInput';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {validateBankAccount} from '@pages/SimplifiedBankOnboarding/actions/USDBankAccount';
import useStepRequest from '@pages/SimplifiedBankOnboarding/requests/useStepRequest';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import {getBankAccountParams} from '@pages/SimplifiedBankOnboarding/utils/OnboardingAccountUtils';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';
import {View} from 'react-native';

const AMOUNT_KEYS = [INPUT_IDS.AMOUNT_1, INPUT_IDS.AMOUNT_2, INPUT_IDS.AMOUNT_3] as const;

function isValidAmount(amount: string | undefined): boolean {
    const trimmedAmount = amount?.trim() ?? '';
    return trimmedAmount !== '' && !Number.isNaN(Number(trimmedAmount)) && Number(trimmedAmount) > 0;
}

function BankAccountValidationForm() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);

    const achData = account?.achData;
    const {send, isPending, errorMessage} = useStepRequest();

    const validate = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>): FormInputErrors<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM> => {
        const errors: FormInputErrors<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM> = {};
        for (const key of AMOUNT_KEYS) {
            if (!isValidAmount(values[key])) {
                errors[key] = translate('common.error.invalidAmount');
            }
        }
        return errors;
    };

    const submit = (values: FormOnyxValues<typeof ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM>) => {
        const amounts = AMOUNT_KEYS.map((key) => values[key]?.trim() ?? '');
        send((requestID) => validateBankAccount(requestID, getBankAccountParams(achData?.policyID, achData), amounts));
    };

    return (
        <FormProvider
            formID={ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM}
            submitButtonText={translate('connectBankAccountStep.validateButtonText')}
            onSubmit={submit}
            validate={validate}
            style={[styles.mh5, styles.flexGrow1]}
            isLoading={isPending}
        >
            <Text>{translate('connectBankAccountStep.description')}</Text>
            <Text style={[styles.textSupporting, styles.mt3]}>{`The mock server expects ${SBO_CONST.MOCK.MICRO_DEPOSIT_AMOUNTS.join(', ')}.`}</Text>
            <View style={styles.mv5}>
                {AMOUNT_KEYS.map((key, index) => (
                    <InputWrapper
                        key={key}
                        InputComponent={TextInput}
                        inputID={key}
                        shouldSaveDraft
                        containerStyles={styles.mb6}
                        inputMode={CONST.INPUT_MODE.DECIMAL}
                        autoCapitalize="words"
                        label={`${translate('connectBankAccountStep.validationInputLabel')} ${index + 1}`}
                        aria-label={`${translate('connectBankAccountStep.validationInputLabel')} ${index + 1}`}
                        role={CONST.ROLE.PRESENTATION}
                        maxLength={CONST.VALIDATION_REIMBURSEMENT_INPUT_LIMIT}
                        sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.EDIT_INPUT}
                    />
                ))}
            </View>
            <FormHelpMessage message={errorMessage} />
        </FormProvider>
    );
}

export default BankAccountValidationForm;
