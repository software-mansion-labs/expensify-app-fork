import useOnyx from '@hooks/useOnyx';

import type {FlowDataSource} from '@pages/SimplifiedBankOnboarding/core';

import ONYXKEYS from '@src/ONYXKEYS';

import type FlowData from './types';

import useReadFlowData from './useReadFlowData';

/** The draft and the server data that the plan of a bank account flow is built from. A key that is not loaded yet reads as no data. */
function useFlowData(): FlowDataSource<FlowData> {
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [workspaces] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES);
    const [bankFields] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_BANK_FIELDS);
    const [picklists] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PICKLISTS);
    const [plaidLinkToken] = useOnyx(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_PLAID_LINK_TOKEN);
    const [onfidoToken] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ONFIDO_TOKEN);
    const readData = useReadFlowData();

    return {data: {draft, account, workspaces, bankFields, picklists, plaidLinkToken, onfidoToken}, readData};
}

export default useFlowData;
