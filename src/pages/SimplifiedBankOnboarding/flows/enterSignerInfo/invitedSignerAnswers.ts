/**
 * The answers of the invited director flow: the signer form draft, else empty. The invited director has no saved values
 * to show, because the server keeps the director of the bank account and not the input of this form.
 */
import useOnyx from '@hooks/useOnyx';

import type {SignerDetailsValues} from '@pages/SimplifiedBankOnboarding/flows/shared/signerDetails/renderSignerDetailsPages';

import ONYXKEYS from '@src/ONYXKEYS';

type InvitedSignerAnswers = SignerDetailsValues;

function useInvitedSignerAnswers(): InvitedSignerAnswers {
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM_DRAFT);

    return {
        signerFullName: draft?.signerFullName ?? '',
        signerJobTitle: draft?.signerJobTitle ?? '',
    };
}

export {useInvitedSignerAnswers};
export type {InvitedSignerAnswers};
