/**
 * The data and the target of the USD and the NonUSD flow screens. It waits for the account of the workspace, so the
 * screen of a flow that needs more data can read it from the same data before it shows the flow page.
 */
import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';

import type {FlowDataSource, FlowDataStatus} from '@pages/SimplifiedBankOnboarding/controller/types';
import useFlowAccountRead from '@pages/SimplifiedBankOnboarding/controller/useFlowAccountRead';
import useFlowData from '@pages/SimplifiedBankOnboarding/controller/useFlowData';
import getFlowPolicyID from '@pages/SimplifiedBankOnboarding/model/getFlowPolicyID';
import type FlowData from '@pages/SimplifiedBankOnboarding/model/types';
import type {FlowRouteTarget} from '@pages/SimplifiedBankOnboarding/navigation/routes';

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
