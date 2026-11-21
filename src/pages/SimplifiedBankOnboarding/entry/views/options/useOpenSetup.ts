/**
 * Opens the flow from a setup option. A user who is not validated passes the verify account page first, which opens
 * the flow once the code is accepted. The option saved the draft just before, so the flow is opened from a fresh read.
 */
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';

import type {OnboardingUser} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import {goToVerifyAccount} from '@pages/SimplifiedBankOnboarding/entry/entryNavigation';
import {openFlowAtResume, useReadFlowData} from '@pages/SimplifiedBankOnboarding/flows';

import ONYXKEYS from '@src/ONYXKEYS';
import type {Route} from '@src/ROUTES';

import type {OnyxEntry} from 'react-native-onyx';

const isUserValidatedSelector = (user: OnyxEntry<OnboardingUser>) => !!user?.validated;

function useOpenSetup(policyID: string | undefined, backTo: Route | undefined): () => Promise<void> {
    const {translate} = useLocalize();
    const [isUserValidated = false] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_USER, {selector: isUserValidatedSelector});
    const readFlowData = useReadFlowData();

    const openSetup = async () => {
        if (!isUserValidated) {
            goToVerifyAccount(policyID, backTo);
            return;
        }
        openFlowAtResume({data: await readFlowData(), context: {translate, policyID}, backTo});
    };
    return openSetup;
}

export default useOpenSetup;
