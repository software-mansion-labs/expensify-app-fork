/**
 * The screen body of the USD and the NonUSD flow. It leaves everything to the shared flow page, so a screen that needs
 * more data before the pages make sense wraps this body itself.
 */
import useThemeStyles from '@hooks/useThemeStyles';

import {OnboardingFlowPage} from '@pages/SimplifiedBankOnboarding/core';
import type FlowData from '@pages/SimplifiedBankOnboarding/flows/shared/flowData/types';
import type {FlowDescriptor} from '@pages/SimplifiedBankOnboarding/flows/shared/plan/types';
import {getFlowRoutes} from '@pages/SimplifiedBankOnboarding/flows/shared/routes/flowNavigation';
import {getPositionFromParams} from '@pages/SimplifiedBankOnboarding/flows/shared/routes/flowRoutes';

import React from 'react';
import {View} from 'react-native';

import type {SetupFlow, SetupFlowParams} from './useSetupFlow';

type SetupFlowPageProps = {
    flow: FlowDescriptor<FlowData>;
    setup: SetupFlow;
    params: SetupFlowParams | undefined;
};

function SetupFlowPage({flow, setup, params}: SetupFlowPageProps) {
    const styles = useThemeStyles();

    return (
        <View style={[styles.flex1, styles.appBG]}>
            <OnboardingFlowPage
                flow={flow}
                routes={getFlowRoutes(setup.target)}
                urlPosition={getPositionFromParams(setup.target, {page: params?.page, subPage: params?.subPage, action: params?.action})}
                policyID={setup.target.policyID}
                dataSource={setup.dataSource}
                dataStatus={setup.dataStatus}
            />
        </View>
    );
}

export default SetupFlowPage;
