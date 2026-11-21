/**
 * The screen body of the USD and the NonUSD flow. It leaves everything to the shared flow page, so a screen that needs
 * more data before the pages make sense wraps this body itself.
 */
import useThemeStyles from '@hooks/useThemeStyles';

import type {FlowDescriptor} from '@pages/SimplifiedBankOnboarding/core';
import {OnboardingFlowPage} from '@pages/SimplifiedBankOnboarding/core';
import type FlowData from '@pages/SimplifiedBankOnboarding/flows/shared/flowData/types';

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
                target={setup.target}
                routeParams={{page: params?.page, subPage: params?.subPage, action: params?.action}}
                dataSource={setup.dataSource}
                dataStatus={setup.dataStatus}
            />
        </View>
    );
}

export default SetupFlowPage;
