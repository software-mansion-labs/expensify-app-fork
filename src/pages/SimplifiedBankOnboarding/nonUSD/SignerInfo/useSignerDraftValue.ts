/**
 * Reads one signer input from the draft of the form that a signer sub page writes to. Like the real signer sub pages,
 * the default value comes from the draft only, because the step seeds the draft from the server data beforehand.
 */
import useOnyx from '@hooks/useOnyx';

import type {SIGNER_INPUT_IDS} from '@pages/SimplifiedBankOnboarding/types/form';

import ONYXKEYS from '@src/ONYXKEYS';

import type {ValueOf} from 'type-fest';

import type {SignerFormID} from './types';

function useSignerDraftValue(formID: SignerFormID, inputID: ValueOf<typeof SIGNER_INPUT_IDS>): string {
    const [onboardingDraft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
    const [signerDraft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM_DRAFT);

    const draft = formID === ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM ? onboardingDraft : signerDraft;
    return draft?.[inputID] ?? '';
}

export default useSignerDraftValue;
