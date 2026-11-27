/**
 * The test deposit form of the USD validation step. It sends the three amounts and does not move on by itself: a right
 * answer opens the bank account, and the step then shows the connected screen in place of the form. A wrong answer shows
 * the error, and too many wrong answers make the step show the block message.
 */
import FormProvider from '@components/Form/FormProvider';
import Text from '@components/Text';
import TextInput from '@components/TextInput';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import type {OnboardingDraft, TextInputID} from '@pages/SimplifiedBankOnboarding/contract/form';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type {SubPageFormErrors} from '@pages/SimplifiedBankOnboarding/core';
import {RequestErrorMessage, SubPageInput, useOnboardingFlow, useOnboardingRequest} from '@pages/SimplifiedBankOnboarding/core';

import CONST from '@src/CONST';

import React from 'react';
import {View} from 'react-native';

import validationRequest from './validationRequest';

const AMOUNT_INPUT_IDS: TextInputID[] = [INPUT_IDS.AMOUNT_1, INPUT_IDS.AMOUNT_2, INPUT_IDS.AMOUNT_3];

function isValidAmount(amount: string | undefined): boolean {
    const trimmedAmount = amount?.trim() ?? '';
    return trimmedAmount !== '' && !Number.isNaN(Number(trimmedAmount)) && Number(trimmedAmount) > 0;
}

function DepositsForm() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {formID} = useOnboardingFlow();
    const {send, isPending, errorMessage} = useOnboardingRequest(validationRequest);

    const validateAmounts = (values: OnboardingDraft): SubPageFormErrors => {
        const errors: SubPageFormErrors = {};
        for (const inputID of AMOUNT_INPUT_IDS) {
            if (!isValidAmount(values[inputID])) {
                errors[inputID] = translate('common.error.invalidAmount');
            }
        }
        return errors;
    };

    const sendAmounts = (values: OnboardingDraft) => {
        send(AMOUNT_INPUT_IDS.map((inputID) => values[inputID]?.trim() ?? ''));
    };

    return (
        <FormProvider
            formID={formID}
            submitButtonText={translate('connectBankAccountStep.validateButtonText')}
            onSubmit={sendAmounts}
            validate={validateAmounts}
            style={[styles.mh5, styles.flexGrow1]}
            isLoading={isPending}
            footerContent={<RequestErrorMessage message={errorMessage} />}
            shouldRenderFooterAboveSubmit
            sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SUBMIT_STEP}
        >
            <Text>{translate('connectBankAccountStep.description')}</Text>
            <Text style={[styles.textSupporting, styles.mt3]}>{`The mock server expects ${SBO_CONST.MOCK.MICRO_DEPOSIT_AMOUNTS.join(', ')}.`}</Text>
            <View style={styles.mv5}>
                {AMOUNT_INPUT_IDS.map((inputID, index) => (
                    <SubPageInput
                        key={inputID}
                        InputComponent={TextInput}
                        inputID={inputID}
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
        </FormProvider>
    );
}

export default DepositsForm;
