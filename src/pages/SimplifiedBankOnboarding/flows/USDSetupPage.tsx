/**
 * The screen of the USD flow. It turns the route into the target of the controller and leaves everything else to the
 * shared flow page.
 */
import useThemeStyles from '@hooks/useThemeStyles';

import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import OnboardingFlowPage from '@pages/SimplifiedBankOnboarding/controller/OnboardingFlowPage';
import type {FlowRouteTarget} from '@pages/SimplifiedBankOnboarding/navigation/routes';

import type SCREENS from '@src/SCREENS';

import React from 'react';
import {View} from 'react-native';

import usdFlow from './usdFlow';

type USDSetupPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.USD_SETUP>;

function USDSetupPage({route}: USDSetupPageProps) {
    const styles = useThemeStyles();
    const target: FlowRouteTarget = {kind: 'usd', policyID: route.params?.policyID, backTo: route.params?.backTo};

    return (
        <View style={[styles.flex1, styles.appBG]}>
            <OnboardingFlowPage
                flow={usdFlow}
                target={target}
                routeParams={{page: route.params?.page, subPage: route.params?.subPage, action: route.params?.action}}
            />
        </View>
    );
}

export default USDSetupPage;
