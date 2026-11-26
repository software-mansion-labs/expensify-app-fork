/* eslint-disable rulesdir/prefer-actions-set-data -- This file is the action layer of an isolated research module, so it lives outside src/libs/actions */
/**
 * The client writes of a setup option of the entry (Connect with Plaid, Connect manually). They run before the flow
 * opens, or after the verify page validated the user when the option was remembered.
 */
import {getNewAccountForPolicy} from '@pages/SimplifiedBankOnboarding/contract/defaultAccount';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import type {SetupType} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {saveDraft} from '@pages/SimplifiedBankOnboarding/core';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

type SetupOptionOptions = {
    setupType: SetupType;
    policyID: string | undefined;
    isNonUSD: boolean;
    currency: string;

    /** The instance that collects a new bank account while the old one stays connected */
    isChangingBankAccount: boolean;
};

/** Remembers the option that an unvalidated user picked, so it runs once the verify page validated the user */
function setSetupOptionPressed(option: SetupType | null): Promise<void> {
    return Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_OPTION_PRESSED, option);
}

/** Clears the data of the connected bank account on the client, so the flow can collect a new one without disconnecting the old one first */
async function prepareNewBankAccountSetup(policyID: string, currency: string): Promise<void> {
    await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, getNewAccountForPolicy(policyID));
    await Onyx.set(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT, {
        currency,
    });
}

/** Clears the Plaid link token and the Plaid data before "Connect with Plaid" */
async function clearPlaid(): Promise<void> {
    await Onyx.set(ONYXKEYS.RAM_ONLY_SIMPLIFIED_BANK_ONBOARDING_PLAID_LINK_TOKEN, null);
    await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_PLAID_DATA, {});
}

/** A new setup must not be prefilled with the bank account that it replaces */
async function removeExistingBankAccountDetails({policyID, currency, isChangingBankAccount}: SetupOptionOptions): Promise<void> {
    if (isChangingBankAccount && !!policyID && !!currency) {
        await prepareNewBankAccountSetup(policyID, currency);
        return;
    }
    await saveDraft({
        [INPUT_IDS.ROUTING_NUMBER]: '',
        [INPUT_IDS.ACCOUNT_NUMBER]: '',
        [INPUT_IDS.BANK_NAME]: '',
        [INPUT_IDS.PLAID_ACCOUNT_ID]: '',
    });
    await Onyx.merge(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {
        achData: {bankAccountID: CONST.DEFAULT_NUMBER_ID},
    });
}

/**
 * Prepares the data of a picked option: removes the old bank account details, clears Plaid for the Plaid option, and
 * stores the setup type in the draft, which the USD bank step reads (BC-10). The NonUSD flow has only the manual setup.
 */
async function prepareSetupOption(options: SetupOptionOptions): Promise<void> {
    await removeExistingBankAccountDetails(options);
    if (options.setupType === SBO_CONST.SETUP_TYPE.PLAID) {
        await clearPlaid();
    }
    if (options.isNonUSD) {
        return;
    }
    await saveDraft({setupType: options.setupType});
}

export {clearPlaid, prepareNewBankAccountSetup, prepareSetupOption, setSetupOptionPressed};
export type {SetupOptionOptions};
