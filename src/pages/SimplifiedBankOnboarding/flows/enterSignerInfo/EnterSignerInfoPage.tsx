/**
 * The page that an invited director opens from the email. It mirrors `ReimbursementAccount/EnterSignerInfo` on the
 * modular flow: a separate form with its own draft, the signer details pages of the NonUSD flow and the request of the
 * invited director, which the controller awaits before it leaves the page. In the lab the signer step opens it with a
 * mock button.
 */
import Button from '@components/Button';
import InteractiveStepWrapper from '@components/InteractiveStepWrapper';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import {OnboardingFlowPage} from '@pages/SimplifiedBankOnboarding/core';
import {exitFlow, getFlowRoutes} from '@pages/SimplifiedBankOnboarding/flows/shared/routes/flowNavigation';
import type {FlowRouteTarget} from '@pages/SimplifiedBankOnboarding/flows/shared/routes/flowRoutes';
import {getPositionFromParams} from '@pages/SimplifiedBankOnboarding/flows/shared/routes/flowRoutes';

import CONST from '@src/CONST';
import type SCREENS from '@src/SCREENS';

import React from 'react';
import {View} from 'react-native';

import signerFlow from './signerFlow';
import useSignerFlowData from './useSignerFlowData';

type EnterSignerInfoPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.ENTER_SIGNER_INFO>;

function EnterSignerInfoPage({route}: EnterSignerInfoPageProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const bankAccountIDParam = route.params?.bankAccountID;
    const bankAccountID = bankAccountIDParam ? Number(bankAccountIDParam) : undefined;
    const isCompleted = route.params?.isCompleted === 'true';
    const dataSource = useSignerFlowData(bankAccountID);
    const target: FlowRouteTarget = {kind: 'enterSignerInfo', policyID: route.params?.policyID, bankAccountID, isCompleted};

    // The director already sent the details, so the email link only confirms it
    if (isCompleted) {
        return (
            <InteractiveStepWrapper
                wrapperID={signerFlow.wrapperID}
                handleBackButtonPress={() => exitFlow(target)}
                headerTitle={translate('signerInfoStep.signerInfo')}
            >
                <View style={[styles.mh5, styles.gap3]}>
                    <Text style={styles.textHeadlineLineHeightXXL}>{translate('workspace.bankAccount.allSet')}</Text>
                    <Button
                        onPress={() => exitFlow(target)}
                        sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.SUBMIT_STEP}
                    >
                        <Button.Text>{translate('common.close')}</Button.Text>
                    </Button>
                </View>
            </InteractiveStepWrapper>
        );
    }

    return (
        <OnboardingFlowPage
            flow={signerFlow}
            routes={getFlowRoutes(target)}
            urlPosition={getPositionFromParams(target, {subPage: route.params?.subPage, action: route.params?.action})}
            policyID={target.policyID}
            dataSource={dataSource}
            dataStatus="ready"
        />
    );
}

export default EnterSignerInfoPage;
