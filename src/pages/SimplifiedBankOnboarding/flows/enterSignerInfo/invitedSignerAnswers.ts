/**
 * The answers of the invited director flow: the signer form draft, else empty. The invited director has no saved values
 * to show, because the server keeps the director of the bank account and not the input of this form.
 */
import type {FlowData} from '@pages/SimplifiedBankOnboarding/core';
import type {SignerDetailsValues} from '@pages/SimplifiedBankOnboarding/flows/shared/signerDetails/getSignerDetailsPages';

type InvitedSignerAnswers = SignerDetailsValues;

function getInvitedSignerAnswers({draft}: FlowData): InvitedSignerAnswers {
    return {
        signerFullName: draft.signerFullName ?? '',
        signerJobTitle: draft.signerJobTitle ?? '',
    };
}

export default getInvitedSignerAnswers;
export type {InvitedSignerAnswers};
