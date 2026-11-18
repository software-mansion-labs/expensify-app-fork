import ActivityIndicator from '@components/ActivityIndicator';
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useReimbursementAccountSubmitCallback from '@hooks/useReimbursementAccountSubmitCallback';
import useThemeStyles from '@hooks/useThemeStyles';

import getPlaidOAuthReceivedRedirectURI from '@libs/getPlaidOAuthReceivedRedirectURI';
import {getBankAccountIDAsNumber} from '@libs/ReimbursementAccountUtils';

import type USDPageProps from '@pages/ReimbursementAccount/USD/types';

import {connectBankAccountWithPlaid, deletePaymentBankAccount} from '@userActions/BankAccounts';
import {hideBankAccountErrors} from '@userActions/ReimbursementAccount';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ReimbursementAccountForm} from '@src/types/form';
import INPUT_IDS from '@src/types/form/ReimbursementAccountForm';

import React from 'react';
import {View} from 'react-native';

import ManualBankInfo from './ManualBankInfo';
import Plaid from './subSteps/Plaid';

const BANK_INFO_STEP_KEYS = INPUT_IDS.BANK_INFO_STEP;
const receivedRedirectURI = getPlaidOAuthReceivedRedirectURI();

/** The "Bank info" step of the USD bank account setup, in the Plaid or the manual variant the user picked */
function BankInfo({onBackButtonPress, onSubmit, policyID, backTo}: USDPageProps) {
    const styles = useThemeStyles();
    const [reimbursementAccount] = useOnyx(ONYXKEYS.REIMBURSEMENT_ACCOUNT);
    const [plaidLinkToken] = useOnyx(ONYXKEYS.RAM_ONLY_PLAID_LINK_TOKEN);
    const {translate} = useLocalize();
    const markSubmitting = useReimbursementAccountSubmitCallback(onSubmit);

    let setupType = reimbursementAccount?.achData?.subStep ?? '';

    const shouldReinitializePlaidLink = plaidLinkToken && receivedRedirectURI && setupType !== CONST.BANK_ACCOUNT.SETUP_TYPE.MANUAL;
    if (shouldReinitializePlaidLink) {
        setupType = CONST.BANK_ACCOUNT.SETUP_TYPE.PLAID;
    }

    const bankAccountID = getBankAccountIDAsNumber(reimbursementAccount?.achData);
    const submit = (submitData: unknown) => {
        const data = submitData as ReimbursementAccountForm;
        const previousPlaidAccountID = reimbursementAccount?.achData?.plaidAccountID;
        const newPlaidAccountID = data[BANK_INFO_STEP_KEYS.PLAID_ACCOUNT_ID];
        const plaidAccountIDChanged = !!bankAccountID && !!previousPlaidAccountID && previousPlaidAccountID !== newPlaidAccountID;
        if (plaidAccountIDChanged) {
            deletePaymentBankAccount(bankAccountID, undefined);
        }
        const didStartRequest = connectBankAccountWithPlaid(
            plaidAccountIDChanged ? CONST.DEFAULT_NUMBER_ID : bankAccountID,
            {
                [BANK_INFO_STEP_KEYS.ROUTING_NUMBER]: data[BANK_INFO_STEP_KEYS.ROUTING_NUMBER] ?? '',
                [BANK_INFO_STEP_KEYS.ACCOUNT_NUMBER]: data[BANK_INFO_STEP_KEYS.ACCOUNT_NUMBER] ?? '',
                [BANK_INFO_STEP_KEYS.BANK_NAME]: data[BANK_INFO_STEP_KEYS.BANK_NAME] ?? '',
                [BANK_INFO_STEP_KEYS.PLAID_ACCOUNT_ID]: data[BANK_INFO_STEP_KEYS.PLAID_ACCOUNT_ID] ?? '',
                [BANK_INFO_STEP_KEYS.PLAID_ACCESS_TOKEN]: data[BANK_INFO_STEP_KEYS.PLAID_ACCESS_TOKEN] ?? '',
                [BANK_INFO_STEP_KEYS.PLAID_MASK]: data[BANK_INFO_STEP_KEYS.PLAID_MASK] ?? '',
                [BANK_INFO_STEP_KEYS.IS_SAVINGS]: data[BANK_INFO_STEP_KEYS.IS_SAVINGS] ?? false,
            },
            policyID,
        );

        // Deferred navigation must only be armed when a bank account request was actually sent. The new Chase
        // Plaid flow sends nothing and switches to manual entry instead, so advancing there would move the user
        // to the next step with no bank account created.
        if (!didStartRequest) {
            return;
        }

        markSubmitting();
    };

    const handleBackButtonPress = () => {
        onBackButtonPress();
        hideBankAccountErrors();
    };

    if (setupType === CONST.BANK_ACCOUNT.SETUP_TYPE.MANUAL) {
        return (
            <ManualBankInfo
                onBackButtonPress={handleBackButtonPress}
                onSubmit={onSubmit}
                policyID={policyID}
                backTo={backTo}
            />
        );
    }

    return (
        <InteractiveStepWrapper
            wrapperID="BankInfo"
            shouldEnablePickerAvoiding={false}
            handleBackButtonPress={handleBackButtonPress}
            headerTitle={translate('bankAccount.bankInfo')}
            startStepIndex={1}
            stepNames={CONST.BANK_ACCOUNT.STEP_NAMES}
        >
            {setupType === CONST.BANK_ACCOUNT.SETUP_TYPE.PLAID ? (
                <Plaid onNext={submit} />
            ) : (
                <View style={[styles.flex1, styles.alignItemsCenter, styles.justifyContentCenter]}>
                    <ActivityIndicator size={CONST.ACTIVITY_INDICATOR_SIZE.LARGE} />
                </View>
            )}
        </InteractiveStepWrapper>
    );
}

export default BankInfo;
