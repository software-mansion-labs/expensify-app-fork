/**
 * The screen of the NonUSD flow. It turns the route into the target of the controller, waits for the account of the
 * workspace, reads the server lists that the forms need and leaves everything else to the shared flow page.
 */
import useThemeStyles from '@hooks/useThemeStyles';

import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import NotFoundPage from '@pages/ErrorPage/NotFoundPage';
import OnboardingFlowPage from '@pages/SimplifiedBankOnboarding/controller/OnboardingFlowPage';
import useFlowAccountRead from '@pages/SimplifiedBankOnboarding/controller/useFlowAccountRead';
import useFlowData from '@pages/SimplifiedBankOnboarding/controller/useFlowData';
import type {FlowRouteTarget} from '@pages/SimplifiedBankOnboarding/navigation/routes';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import type SCREENS from '@src/SCREENS';

import React from 'react';
import {View} from 'react-native';

import nonUSDFlow from './nonUSDFlow';
import useNonUSDServerLists from './useNonUSDServerLists';

type NonUSDSetupPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.NON_USD_SETUP>;

function NonUSDSetupPage({route}: NonUSDSetupPageProps) {
    const styles = useThemeStyles();
    const dataSource = useFlowData();

    // A URL without a workspace takes the workspace of the account data, so the next URLs of the flow name it
    const policyID = route.params?.policyID ?? dataSource.data.account?.achData?.policyID;
    const target: FlowRouteTarget = {kind: 'nonUSD', policyID, backTo: route.params?.backTo};
    const dataStatus = useFlowAccountRead(route.params?.policyID, dataSource.data.account);
    const {hasBankFieldsReadFailed} = useNonUSDServerLists(dataSource.data, policyID);

    // Like the real bank step, a failed read of the bank inputs leaves the step with nothing to show
    if (hasBankFieldsReadFailed && route.params?.page === SBO_CONST.NON_USD.PAGE_NAMES.BANK_INFO) {
        return <NotFoundPage />;
    }

    return (
        <View style={[styles.flex1, styles.appBG]}>
            <OnboardingFlowPage
                flow={nonUSDFlow}
                target={target}
                routeParams={{page: route.params?.page, subPage: route.params?.subPage, action: route.params?.action}}
                dataSource={dataSource}
                dataStatus={dataStatus}
            />
        </View>
    );
}

export default NonUSDSetupPage;
