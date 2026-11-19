/**
 * The bank step of the USD flow. The sub page of the URL picks the Plaid or the manual variant, and the flow definition
 * puts it there. The container owns the request, follows it by its own ID, and passes its state to the variant.
 */
import ActivityIndicator from '@components/ActivityIndicator';
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {clearOnboardingAccountErrors} from '@pages/SimplifiedBankOnboarding/actions/OnboardingAccount';
import {connectBankAccountManually, connectBankAccountWithPlaid} from '@pages/SimplifiedBankOnboarding/actions/USDBankAccount';
import {getBankAccountSubPage} from '@pages/SimplifiedBankOnboarding/flow/usdFlow';
import useStepRequest from '@pages/SimplifiedBankOnboarding/requests/useStepRequest';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {OnboardingForm} from '@pages/SimplifiedBankOnboarding/types/form';
import type {OnboardingAccount} from '@pages/SimplifiedBankOnboarding/types/onyx';
import type USDPageProps from '@pages/SimplifiedBankOnboarding/usd/types';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import type {OnyxEntry} from 'react-native-onyx';

import React from 'react';
import {View} from 'react-native';

import type {BankAccountValues} from './types';

import Manual from './subSteps/Manual';
import Plaid from './subSteps/Plaid';

type BankInfoProps = Pick<USDPageProps, 'onSubmit' | 'onBackButtonPress' | 'policyID' | 'currentSubPage' | 'stepNames' | 'startStepIndex'>;

function selectBankAccountID(account: OnyxEntry<OnboardingAccount>) {
    return account?.achData?.bankAccountID;
}

function selectSetupType(draft: OnyxEntry<OnboardingForm>) {
    return draft?.setupType;
}

function BankInfo({onSubmit, onBackButtonPress, policyID, currentSubPage, stepNames, startStepIndex}: BankInfoProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const [bankAccountID] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {selector: selectBankAccountID});
    const [draftSetupType] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT, {selector: selectSetupType});
    const {send, isPending, errorMessage} = useStepRequest({onSuccess: onSubmit});

    const setupType = currentSubPage ?? getBankAccountSubPage(bankAccountID, draftSetupType);

    const submit = (values: BankAccountValues) => {
        if (!policyID) {
            return;
        }
        const {plaidAccountID} = values;
        if (setupType === SBO_CONST.SETUP_TYPE.MANUAL) {
            send((requestID) => connectBankAccountManually(requestID, policyID, values.routingNumber ?? '', values.accountNumber ?? ''));
        } else if (setupType === SBO_CONST.SETUP_TYPE.PLAID && plaidAccountID) {
            send((requestID) => connectBankAccountWithPlaid(requestID, policyID, plaidAccountID));
        }
    };

    const renderBankInfo = () => {
        switch (setupType) {
            case SBO_CONST.SETUP_TYPE.PLAID:
                return (
                    <Plaid
                        onNext={submit}
                        isRequestPending={isPending}
                        requestErrorMessage={errorMessage}
                    />
                );
            case SBO_CONST.SETUP_TYPE.MANUAL:
                return (
                    <Manual
                        onNext={submit}
                        isRequestPending={isPending}
                        requestErrorMessage={errorMessage}
                    />
                );
            default:
                return (
                    <View style={[styles.flex1, styles.alignItemsCenter, styles.justifyContentCenter]}>
                        <ActivityIndicator size={CONST.ACTIVITY_INDICATOR_SIZE.LARGE} />
                    </View>
                );
        }
    };

    const handleBackButtonPress = () => {
        onBackButtonPress();
        clearOnboardingAccountErrors();
    };

    return (
        <InteractiveStepWrapper
            wrapperID="SimplifiedBankOnboardingBankInfo"
            shouldEnablePickerAvoiding={false}
            handleBackButtonPress={handleBackButtonPress}
            headerTitle={translate('bankAccount.bankInfo')}
            startStepIndex={startStepIndex}
            stepNames={stepNames}
        >
            {renderBankInfo()}
        </InteractiveStepWrapper>
    );
}

export default BankInfo;
