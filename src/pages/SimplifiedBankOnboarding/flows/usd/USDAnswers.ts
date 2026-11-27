/**
 * The answers of the USD flow: one flat object with every value the plan builder reads. Each value is the draft value
 * when the user typed one, else the value that the server saved. Questions stay undefined until either side answered them.
 */
import type {USDOwnerDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {SetupType} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import type {OwnerQuestionAnswers} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/types';

import type {FileObject} from '@src/types/utils/Attachment';

type USDAnswers = OwnerQuestionAnswers & {
    setupType: SetupType | undefined;
    country: string;
    routingNumber: string;

    /** The server only returns the masked number */
    accountNumber: string;
    plaidAccountID: string | undefined;
    firstName: string;
    lastName: string;
    dob: string;
    ssnLast4: string;
    companyName: string;
    companyTaxID: string;
    incorporationType: string;

    /** The other owners. The user is the requestor and is not in this list. */
    owners: USDOwnerDraft[];
    isAuthorizedToUseBankAccount: boolean;
    certifyTrueInformation: boolean;
    acceptTermsAndConditions: boolean;
    companyTaxIDDocument: FileObject[];
    companyAddressDocument: FileObject[];
    amount1: string;
    amount2: string;
    amount3: string;
};

export default USDAnswers;
