/**
 * The inputs of the NonUSD signer step. The server has no field for the director question, so a saved director name
 * answers it with yes until the user changes the answer in the draft. A user who is also an owner skips the name page,
 * and the request takes the name that the owner step holds.
 */
import type {DraftFields} from '@pages/SimplifiedBankOnboarding/requests/buildTrackedRequestData';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type {CorpayData} from '@pages/SimplifiedBankOnboarding/types/onyx';
import type {OnboardingDraft, ResolvedValues} from '@pages/SimplifiedBankOnboarding/values/resolveValue';

const SIGNER_KEYS = {
    SIGNER_FULL_NAME: INPUT_IDS.SIGNER_FULL_NAME,
    SIGNER_JOB_TITLE: INPUT_IDS.SIGNER_JOB_TITLE,
};

type SignerValues = ResolvedValues<(typeof SIGNER_KEYS)[keyof typeof SIGNER_KEYS]>;

const DIRECTOR_FIELDS_TO_CLEAR: DraftFields = [...Object.values(SIGNER_KEYS), 'isUserDirector'];

// The answer stays, because a "no" would fall back to a director that the server saved earlier.
const SIGNER_EMAIL_FIELDS_TO_CLEAR: DraftFields = [INPUT_IDS.SIGNER_EMAIL, INPUT_IDS.SECOND_SIGNER_EMAIL];

function resolveIsUserDirector(draft: OnboardingDraft, corpay: CorpayData | undefined): boolean {
    return draft?.isUserDirector ?? !!corpay?.signerFullName;
}

/** The owner name replaces the signer name when the user is also an owner, because the name page was skipped */
function toDirectorParams(values: SignerValues, ownerFullName: string | undefined): SignerValues {
    return {signerFullName: ownerFullName ?? values.signerFullName, signerJobTitle: values.signerJobTitle};
}

export {DIRECTOR_FIELDS_TO_CLEAR, SIGNER_EMAIL_FIELDS_TO_CLEAR, SIGNER_KEYS, resolveIsUserDirector, toDirectorParams};
export type {SignerValues};
