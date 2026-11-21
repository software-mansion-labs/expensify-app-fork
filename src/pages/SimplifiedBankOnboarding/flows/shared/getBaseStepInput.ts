import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {ACHData, OnboardingAccount} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import type {BankAccountParams} from '@pages/SimplifiedBankOnboarding/core';

import type {OnyxEntry} from 'react-native-onyx';

import getFlowPolicyID from './flowData/getFlowPolicyID';
import getBankAccountParams from './getBankAccountParams';

/** What the step builders of every flow read, computed once per plan */
type BaseStepInput = {
    account: OnyxEntry<OnboardingAccount>;
    achData: ACHData | undefined;

    /** The workspace of the URL, else the workspace of the server data */
    policyID: string | undefined;

    /** Identifies the bank account in the requests of the steps */
    bankAccount: BankAccountParams;
    translate: LocalizedTranslate;
};

function getBaseStepInput(account: OnyxEntry<OnboardingAccount>, policyID: string | undefined, translate: LocalizedTranslate): BaseStepInput {
    const achData = account?.achData;
    const flowPolicyID = getFlowPolicyID(policyID, achData);
    return {
        account,
        achData,
        policyID: flowPolicyID,
        bankAccount: getBankAccountParams(flowPolicyID, achData),
        translate,
    };
}

export default getBaseStepInput;
export type {BaseStepInput};
