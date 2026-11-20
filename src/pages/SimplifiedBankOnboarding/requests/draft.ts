/**
 * Writes of the form draft, the only store of what the user typed. Callers await them before they read the draft again,
 * so the next plan is built from the values that were just saved.
 */
/* eslint-disable rulesdir/prefer-actions-set-data -- This file is the action layer of an isolated research module, so it lives outside src/libs/actions */
import DEFAULT_ACCOUNT from '@pages/SimplifiedBankOnboarding/model/defaultAccount';
import type {InputID, OnboardingDraft} from '@pages/SimplifiedBankOnboarding/types/form';

import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

/** Arrays such as the owner lists replace the saved ones, and `null` removes a value */
function saveDraft(values: OnboardingDraft): Promise<void> {
    return Onyx.merge(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT, values);
}

function clearDraftInputs(inputIDs: InputID[]): Promise<void> {
    const removedValues: Partial<Record<InputID, null>> = {};
    for (const inputID of inputIDs) {
        removedValues[inputID] = null;
    }
    return Onyx.merge(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT, removedValues);
}

function clearDraft(): Promise<void> {
    return Onyx.set(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT, {});
}

/**
 * Starts a setup that replaces a connected bank account. Only the client forgets the old account: the server keeps it
 * until the new one is created. The draft keeps the currency, because the workspace may not name it.
 */
function prepareNewBankAccountSetup(policyID: string | undefined, currency: string | undefined): Promise<void> {
    return Promise.all([
        Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {...DEFAULT_ACCOUNT, achData: {...DEFAULT_ACCOUNT.achData, policyID}}),
        Onyx.set(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT, {currency}),
    ]).then(() => undefined);
}

/** The page of an invited director has its own form, which keeps only the signer inputs of the submitted values */
function saveSignerDraft({signerFullName, signerJobTitle}: OnboardingDraft): Promise<void> {
    return Onyx.merge(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_SIGNER_FORM_DRAFT, {signerFullName, signerJobTitle});
}

export {clearDraft, clearDraftInputs, prepareNewBankAccountSetup, saveDraft, saveSignerDraft};
