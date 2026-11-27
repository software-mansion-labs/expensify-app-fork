import type {OnboardingPicklists} from '@pages/SimplifiedBankOnboarding/contract/onyx';

import type {OnyxEntry} from 'react-native-onyx';

/** The business step has no business types to offer until the picklists of the country arrive */
function arePicklistsLoaded(picklists: OnyxEntry<OnboardingPicklists>): boolean {
    return (picklists?.picklists?.businessType?.length ?? 0) > 0;
}

export default arePicklistsLoaded;
