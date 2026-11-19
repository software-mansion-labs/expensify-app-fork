import useOnyx from '@hooks/useOnyx';

import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

import type {FlowData, FlowDataSource} from './types';

/** The draft and the server data that the plan of a bank account flow is built from. A key that is not loaded yet reads as no data. */
function useFlowData(): FlowDataSource<FlowData> {
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [workspaces] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES);
    const [bankFields] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_BANK_FIELDS);
    const [picklists] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PICKLISTS);

    // Only handlers call it, after a write that the data of the last render does not show yet
    const readData = async (): Promise<FlowData> => {
        const [freshDraft, freshAccount, freshWorkspaces, freshBankFields, freshPicklists] = await Onyx.multiGet([
            ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT,
            ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT,
            ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES,
            ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_BANK_FIELDS,
            ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PICKLISTS,
        ]);
        return {draft: freshDraft ?? undefined, account: freshAccount, workspaces: freshWorkspaces, bankFields: freshBankFields, picklists: freshPicklists};
    };

    return {data: {draft, account, workspaces, bankFields, picklists}, readData};
}

export default useFlowData;
