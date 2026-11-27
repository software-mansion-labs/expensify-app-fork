/**
 * The data and the target of the USD and the NonUSD flow screens. The flow page waits until the account of the
 * workspace is read.
 */
import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';

import type {FlowDataSource, FlowDataStatus} from '@pages/SimplifiedBankOnboarding/core';
import useFlowAccountRead from '@pages/SimplifiedBankOnboarding/flows/shared/accountRead/useFlowAccountRead';
import getFlowPolicyID from '@pages/SimplifiedBankOnboarding/flows/shared/flowData/getFlowPolicyID';
import type FlowData from '@pages/SimplifiedBankOnboarding/flows/shared/flowData/types';
import useFlowData from '@pages/SimplifiedBankOnboarding/flows/shared/flowData/useFlowData';
import type {FlowRouteTarget} from '@pages/SimplifiedBankOnboarding/flows/shared/routes/flowRoutes';

import type SCREENS from '@src/SCREENS';

type SetupFlowParams = BankOnboardingLabParamList[typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.USD_SETUP];

type SetupFlowKind = Extract<FlowRouteTarget, {kind: 'usd' | 'nonUSD'}>['kind'];

type SetupFlow = {
    dataSource: FlowDataSource<FlowData>;
    target: FlowRouteTarget;
    dataStatus: FlowDataStatus;
};

function useSetupFlow(kind: SetupFlowKind, params: SetupFlowParams | undefined): SetupFlow {
    const dataSource = useFlowData();

    // A URL without a workspace takes the workspace of the account data, so the next URLs of the flow name it
    const policyID = getFlowPolicyID(params?.policyID, dataSource.data.account?.achData);
    const target: FlowRouteTarget = {kind, policyID, backTo: params?.backTo};
    const dataStatus = useFlowAccountRead(params?.policyID, dataSource.data.account);

    return {dataSource, target, dataStatus};
}

export default useSetupFlow;
export type {SetupFlow, SetupFlowParams};
