/**
 * The screen of the USD flow. It turns the route into the target of the controller, waits for the account of the
 * workspace and leaves everything else to the shared flow page.
 */
import useThemeStyles from '@hooks/useThemeStyles';

import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import OnboardingFlowPage from '@pages/SimplifiedBankOnboarding/controller/OnboardingFlowPage';
import useFlowAccountRead from '@pages/SimplifiedBankOnboarding/controller/useFlowAccountRead';
import useFlowData from '@pages/SimplifiedBankOnboarding/controller/useFlowData';
import type {FlowRouteTarget} from '@pages/SimplifiedBankOnboarding/navigation/routes';

import type SCREENS from '@src/SCREENS';

import React from 'react';
import {View} from 'react-native';

import usdFlow from './usdFlow';

type USDSetupPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.USD_SETUP>;

function USDSetupPage({route}: USDSetupPageProps) {
    const styles = useThemeStyles();
    const dataSource = useFlowData();

    // A URL without a workspace takes the workspace of the account data, so the next URLs of the flow name it
    const policyID = route.params?.policyID ?? dataSource.data.account?.achData?.policyID;
    const target: FlowRouteTarget = {kind: 'usd', policyID, backTo: route.params?.backTo};
    const dataStatus = useFlowAccountRead(route.params?.policyID, dataSource.data.account);

    return (
        <View style={[styles.flex1, styles.appBG]}>
            <OnboardingFlowPage
                flow={usdFlow}
                target={target}
                routeParams={{page: route.params?.page, subPage: route.params?.subPage, action: route.params?.action}}
                dataSource={dataSource}
                dataStatus={dataStatus}
            />
        </View>
    );
}

export default USDSetupPage;
