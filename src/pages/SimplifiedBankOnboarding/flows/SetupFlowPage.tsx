/**
 * The screen body of the USD and the NonUSD flow. It turns the route into the target of the controller, waits for the
 * account of the workspace and leaves everything else to the shared flow page. A flow that needs more data before its
 * pages make sense wraps the page in a gate.
 */
import useThemeStyles from '@hooks/useThemeStyles';

import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';

import OnboardingFlowPage from '@pages/SimplifiedBankOnboarding/controller/OnboardingFlowPage';
import type {FlowDescriptor} from '@pages/SimplifiedBankOnboarding/controller/types';
import useFlowAccountRead from '@pages/SimplifiedBankOnboarding/controller/useFlowAccountRead';
import useFlowData from '@pages/SimplifiedBankOnboarding/controller/useFlowData';
import getFlowPolicyID from '@pages/SimplifiedBankOnboarding/model/getFlowPolicyID';
import type FlowData from '@pages/SimplifiedBankOnboarding/model/types';
import type {FlowRouteTarget} from '@pages/SimplifiedBankOnboarding/navigation/routes';

import type SCREENS from '@src/SCREENS';

import type {ComponentType, ReactNode} from 'react';

import React from 'react';
import {View} from 'react-native';

type SetupFlowParams = BankOnboardingLabParamList[typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.USD_SETUP];

type SetupFlowGateProps = {
    data: FlowData;

    /** The workspace of the flow */
    policyID: string | undefined;

    /** The step of the URL */
    stepID: string | undefined;

    /** The flow page, shown while the gate lets it through */
    children: ReactNode;
};

type SetupFlowPageProps = {
    flow: FlowDescriptor<FlowData>;
    kind: Extract<FlowRouteTarget, {kind: 'usd' | 'nonUSD'}>['kind'];
    params: SetupFlowParams | undefined;

    /** Reads what the flow needs besides the account and decides whether the flow page can show */
    Gate?: ComponentType<SetupFlowGateProps>;
};

function SetupFlowPage({flow, kind, params, Gate}: SetupFlowPageProps) {
    const styles = useThemeStyles();
    const dataSource = useFlowData();

    // A URL without a workspace takes the workspace of the account data, so the next URLs of the flow name it
    const policyID = getFlowPolicyID(params?.policyID, dataSource.data.account?.achData);
    const target: FlowRouteTarget = {kind, policyID, backTo: params?.backTo};
    const dataStatus = useFlowAccountRead(params?.policyID, dataSource.data.account);

    const flowPage = (
        <View style={[styles.flex1, styles.appBG]}>
            <OnboardingFlowPage
                flow={flow}
                target={target}
                routeParams={{page: params?.page, subPage: params?.subPage, action: params?.action}}
                dataSource={dataSource}
                dataStatus={dataStatus}
            />
        </View>
    );

    if (!Gate) {
        return flowPage;
    }
    return (
        <Gate
            data={dataSource.data}
            policyID={policyID}
            stepID={params?.page}
        >
            {flowPage}
        </Gate>
    );
}

export default SetupFlowPage;
export type {SetupFlowGateProps};
