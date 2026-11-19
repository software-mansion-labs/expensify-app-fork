/**
 * The bank step of the USD flow. Like the real step it has no sub pages of its own: the setup type stored in
 * `achData.subStep` picks the Plaid or the manual variant, and the URL sub page is only a copy of it. The container owns
 * the request and waits for it with the shared `isLoading` (request style 1).
 */
import ActivityIndicator from '@components/ActivityIndicator';
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {clearOnboardingAccountErrors} from '@pages/SimplifiedBankOnboarding/actions/OnboardingAccount';
import {connectBankAccountManually, connectBankAccountWithPlaid} from '@pages/SimplifiedBankOnboarding/actions/USDBankAccount';
import useOnboardingSubmitCallback from '@pages/SimplifiedBankOnboarding/hooks/useOnboardingSubmitCallback';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type USDPageProps from '@pages/SimplifiedBankOnboarding/usd/types';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import React from 'react';
import {View} from 'react-native';

import type {BankAccountValues} from './types';

import Manual from './subSteps/Manual';
import Plaid from './subSteps/Plaid';

type BankInfoProps = Pick<USDPageProps, 'onSubmit' | 'onBackButtonPress' | 'policyID' | 'stepNames'>;

// The position of this step in the step counter of the header
const STEP_INDEX = 1;

function BankInfo({onSubmit, onBackButtonPress, policyID, stepNames}: BankInfoProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const markSubmitting = useOnboardingSubmitCallback(onSubmit);

    const setupType = account?.achData?.subStep ?? '';

    const submit = (values: BankAccountValues) => {
        if (!policyID) {
            return;
        }
        if (setupType === SBO_CONST.SETUP_TYPE.MANUAL) {
            connectBankAccountManually(policyID, values.routingNumber ?? '', values.accountNumber ?? '');
        } else if (setupType === SBO_CONST.SETUP_TYPE.PLAID && values.plaidAccountID) {
            connectBankAccountWithPlaid(policyID, values.plaidAccountID);
        } else {
            return;
        }
        markSubmitting();
    };

    const renderBankInfo = () => {
        switch (setupType) {
            case SBO_CONST.SETUP_TYPE.PLAID:
                return <Plaid onNext={submit} />;
            case SBO_CONST.SETUP_TYPE.MANUAL:
                return <Manual onNext={submit} />;
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
            startStepIndex={STEP_INDEX}
            stepNames={stepNames}
        >
            {renderBankInfo()}
        </InteractiveStepWrapper>
    );
}

export default BankInfo;
