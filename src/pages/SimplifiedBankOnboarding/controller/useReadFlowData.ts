/**
 * A read of the flow data for handlers, without a subscription. After a write the data of the last render is stale, so
 * a handler reads the keys again before it builds the next plan. A screen that only needs this read does not render
 * again on every change of the keys.
 */
import type FlowData from '@pages/SimplifiedBankOnboarding/model/types';

import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

function useReadFlowData(): () => Promise<FlowData> {
    // Only handlers call it, after a write that the data of the last render does not show yet
    const readFlowData = async (): Promise<FlowData> => {
        const [draft, account, workspaces, bankFields, picklists] = await Onyx.multiGet([
            ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT,
            ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT,
            ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES,
            ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_BANK_FIELDS,
            ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PICKLISTS,
        ]);
        return {draft: draft ?? undefined, account, workspaces, bankFields, picklists};
    };
    return readFlowData;
}

export default useReadFlowData;
