import useOnyx from '@hooks/useOnyx';

import ONYXKEYS from '@src/ONYXKEYS';

import type {FlowData} from './types';

/** The draft and the server data that the plan of the screen is built from. A key that is not loaded yet reads as no data. */
function useFlowData(): FlowData {
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);

    return {draft, account};
}

export default useFlowData;
