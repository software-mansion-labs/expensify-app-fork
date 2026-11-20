import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/types/form';
import type {ACHData, Workspaces} from '@pages/SimplifiedBankOnboarding/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

/** The currency of the workspace decides the NonUSD steps. Without a workspace the account and then the draft tell it. */
function getNonUSDCurrency(workspaces: OnyxEntry<Workspaces>, policyID: string | undefined, achData: ACHData | undefined, draft: OnboardingDraft | undefined): string {
    const workspace = policyID ? workspaces?.[policyID] : undefined;
    return workspace?.outputCurrency ?? achData?.currency ?? draft?.currency ?? '';
}

export default getNonUSDCurrency;
