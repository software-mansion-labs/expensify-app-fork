import useOnyx from '@hooks/useOnyx';

import type {EnterSignerInfoForm} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {FlowDataSource} from '@pages/SimplifiedBankOnboarding/core';

import ONYXKEYS from '@src/ONYXKEYS';

import type {OnyxEntry} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

/** What the plan of the invited director page is built from: the draft of its own form and the account of the email */
type SignerData = {
    draft: OnyxEntry<EnterSignerInfoForm>;
    bankAccountID: number | undefined;
};

function useSignerFlowData(bankAccountID: number | undefined): FlowDataSource<SignerData> {
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM_DRAFT);

    // Only handlers call it, after a write that the data of the last render does not show yet
    const readData = async (): Promise<SignerData> => {
        const freshDraft = await Onyx.get(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM_DRAFT);
        return {draft: freshDraft, bankAccountID};
    };

    return {data: {draft, bankAccountID}, readData};
}

export default useSignerFlowData;
export type {SignerData};
