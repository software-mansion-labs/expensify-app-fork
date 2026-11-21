import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {BankFields, OnboardingAccount, OnboardingPicklists, Workspaces} from '@pages/SimplifiedBankOnboarding/contract/onyx';

import type {OnyxEntry} from 'react-native-onyx';

/** The Onyx values that a plan is built from. A flow reads the ones it needs, such as the server lists of the NonUSD flow. */
type FlowData = {
    draft: OnboardingDraft | undefined;
    account: OnyxEntry<OnboardingAccount>;

    /** The currency of a workspace decides the NonUSD steps */
    workspaces: OnyxEntry<Workspaces>;

    /** The bank inputs that the server describes for a country */
    bankFields: OnyxEntry<BankFields>;
    picklists: OnyxEntry<OnboardingPicklists>;
};

export default FlowData;
