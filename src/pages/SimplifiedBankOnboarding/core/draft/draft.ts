/* eslint-disable rulesdir/prefer-actions-set-data -- This file is the draft layer of an isolated research module, so it lives outside src/libs/actions */
/**
 * The drafts of the two forms of a flow. The main form holds every input of both flows. The invited director form holds
 * only the signer inputs, under the same input IDs, so a flow treats both as an OnboardingDraft.
 */
import type {EnterSignerInfoForm, OnboardingDraft, OnboardingFormID} from '@pages/SimplifiedBankOnboarding/contract/form';

import ONYXKEYS from '@src/ONYXKEYS';

import type {OnyxEntry} from 'react-native-onyx';

import Onyx from 'react-native-onyx';

/** The signer inputs of a draft, the only values the invited director form holds */
function pickSignerValues(draft: OnyxEntry<OnboardingDraft | Partial<EnterSignerInfoForm>>): OnboardingDraft {
    const signerValues: OnboardingDraft = {};
    if (draft?.signerFullName !== undefined) {
        signerValues.signerFullName = draft.signerFullName;
    }
    if (draft?.signerJobTitle !== undefined) {
        signerValues.signerJobTitle = draft.signerJobTitle;
    }
    return signerValues;
}

/** Merges values into the draft of `formID` and resolves when Onyx holds them */
function saveFormDraft(formID: OnboardingFormID, values: OnboardingDraft): Promise<void> {
    if (formID === ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM) {
        return Onyx.merge(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM_DRAFT, pickSignerValues(values));
    }
    return Onyx.merge(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT, values);
}

/** For code outside a flow (entry). Inside a flow use useOnboardingFlow().saveDraft. */
function saveDraft(values: OnboardingDraft): Promise<void> {
    return saveFormDraft(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, values);
}

/** Clears the draft of `formID`. Default: the main form. */
function clearDraft(formID: OnboardingFormID = ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM): Promise<void> {
    if (formID === ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM) {
        return Onyx.set(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM_DRAFT, {});
    }
    return Onyx.set(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT, {});
}

/** The draft of the form of a flow, from the values of both draft keys */
function getFormDraft(formID: OnboardingFormID, mainDraft: OnyxEntry<OnboardingDraft>, signerDraft: OnyxEntry<Partial<EnterSignerInfoForm>>): OnboardingDraft {
    if (formID === ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM) {
        return pickSignerValues(signerDraft);
    }
    return mainDraft ?? {};
}

export {clearDraft, getFormDraft, saveDraft, saveFormDraft};
