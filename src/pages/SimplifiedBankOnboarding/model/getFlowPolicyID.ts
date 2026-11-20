import type {ACHData} from '@pages/SimplifiedBankOnboarding/types/onyx';

/** A flow opened without a workspace in the URL, such as a resumed setup, belongs to the workspace of the server data */
function getFlowPolicyID(policyID: string | undefined, achData: ACHData | undefined): string | undefined {
    return policyID ?? achData?.policyID;
}

export default getFlowPolicyID;
