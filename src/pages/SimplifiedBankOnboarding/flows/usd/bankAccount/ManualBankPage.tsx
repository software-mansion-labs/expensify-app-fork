/**
 * The manual variant of the USD bank step: routing and account number. Once the server created the bank account the
 * inputs lock and show the saved, masked numbers, and Next goes on without sending anything (BC-12), because sending the
 * masked number again would overwrite the real one.
 */
import Text from '@components/Text';
import TextInput from '@components/TextInput';

import useAutoFocusInput from '@hooks/useAutoFocusInput';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import {hasBankAccount} from '@pages/SimplifiedBankOnboarding/contract/setupStatus';
import {FormSubPage, SubPageInput, useFlowData} from '@pages/SimplifiedBankOnboarding/core';
import type {SubPageFormErrors} from '@pages/SimplifiedBankOnboarding/core';

import CONST from '@src/CONST';

import React from 'react';

import {connectManuallyRequest} from './bankAccountRequests';
import getBankAccountAnswers from './getBankAccountAnswers';

const ROUTING_NUMBER_PATTERN = /^\d{9}$/;

function isValidAccountNumber(accountNumber: string): boolean {
    return CONST.BANK_ACCOUNT.REGEX.US_ACCOUNT_NUMBER.test(accountNumber) || CONST.BANK_ACCOUNT.REGEX.MASKED_US_ACCOUNT_NUMBER.test(accountNumber);
}

function ManualBankPage() {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const {inputCallbackRef} = useAutoFocusInput();
    const data = useFlowData();
    const answers = getBankAccountAnswers(data);
    const isLocked = hasBankAccount(data.account?.achData);

    const validate = (values: OnboardingDraft): SubPageFormErrors => {
        const errors: SubPageFormErrors = {};
        const routingNumber = values.routingNumber?.trim();
        const accountNumber = values.accountNumber?.trim();
        if (routingNumber && !ROUTING_NUMBER_PATTERN.test(routingNumber)) {
            errors.routingNumber = translate('bankAccount.error.routingNumber');
        }
        if (accountNumber && !isValidAccountNumber(accountNumber)) {
            errors.accountNumber = translate('bankAccount.error.accountNumber');
        }
        return errors;
    };

    return (
        <FormSubPage
            title={translate('bankAccount.manuallyAdd')}
            inputIDs={[INPUT_IDS.ROUTING_NUMBER, INPUT_IDS.ACCOUNT_NUMBER]}
            validate={validate}
            request={isLocked ? undefined : connectManuallyRequest}
            submitButtonText={translate('common.next')}
        >
            <Text style={[styles.pv3, styles.textSupporting]}>{translate('bankAccount.checkHelpLine')}</Text>
            <SubPageInput
                InputComponent={TextInput}
                ref={inputCallbackRef}
                inputID={INPUT_IDS.ROUTING_NUMBER}
                label={translate('bankAccount.routingNumber')}
                aria-label={translate('bankAccount.routingNumber')}
                role={CONST.ROLE.PRESENTATION}
                defaultValue={answers.routingNumber}
                // A locked input takes its value from the answers, because the form of a screen that stayed mounted under
                // the next step still holds the typed numbers
                value={isLocked ? answers.routingNumber : undefined}
                inputMode={CONST.INPUT_MODE.NUMERIC}
                disabled={isLocked}
                sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.EDIT_INPUT}
            />
            <SubPageInput
                InputComponent={TextInput}
                inputID={INPUT_IDS.ACCOUNT_NUMBER}
                containerStyles={[styles.mt6]}
                label={translate('bankAccount.accountNumber')}
                aria-label={translate('bankAccount.accountNumber')}
                role={CONST.ROLE.PRESENTATION}
                defaultValue={answers.accountNumber}
                value={isLocked ? answers.accountNumber : undefined}
                inputMode={CONST.INPUT_MODE.NUMERIC}
                disabled={isLocked}
                sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.EDIT_INPUT}
            />
        </FormSubPage>
    );
}

export default ManualBankPage;
