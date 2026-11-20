import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {PageID} from '@pages/SimplifiedBankOnboarding/formConfig/types';

type SignerPageIDs = {
    name: PageID;
    jobTitle: PageID;
    confirmation: PageID;
};

/** The details of the director who signs. The NonUSD signer step and the page of an invited director both ask for them. */
type SignerDetailsInput = {
    pageIDs: SignerPageIDs;
    fullName: string;
    jobTitle: string;

    /** False when the name is already known, such as the name of a user who is also an owner */
    shouldAskForName: boolean;

    /** The server saved the details, so the flow does not stop on the confirmation */
    isConfirmationComplete: boolean;
    translate: LocalizedTranslate;
};

export type {SignerDetailsInput, SignerPageIDs};
