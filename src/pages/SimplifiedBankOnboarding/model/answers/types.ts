/**
 * The answers of each flow: one flat object with every value the plan builders read. Each value is the draft value when
 * the user typed one, else the value that the server saved. Questions stay undefined until either side answered them.
 */
import type {OwnerBuffer} from '@pages/SimplifiedBankOnboarding/model/owners/ownerBuffer';
import type {GlobalOwnerDraft, USDOwnerDraft} from '@pages/SimplifiedBankOnboarding/types/form';
import type {SetupType} from '@pages/SimplifiedBankOnboarding/types/onyx';

import type {FileObject} from '@src/types/utils/Attachment';

type OwnerQuestionAnswers = OwnerBuffer & {
    ownsMoreThan25Percent: boolean | undefined;
    hasOtherBeneficialOwners: boolean | undefined;

    /** Asked after each new owner and never saved, so only the draft knows it */
    hasMoreBeneficialOwners: boolean | undefined;

    /** Null while the user adds a new owner */
    ownerBeingModifiedID: string | null;
};

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
    isOnfidoSetupComplete: boolean;
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

type NonUSDAnswers = OwnerQuestionAnswers & {
    setupType: SetupType | undefined;
    country: string;

    // The bank inputs. The server decides which of them a country needs.
    iban: string;
    swiftBicCode: string;
    bsbNumber: string;
    accountNumber: string;
    bankName: string;
    accountHolderName: string;
    accountHolderCountry: string;
    accountHolderRegion: string;

    companyName: string;
    businessType: string;

    /** Every owner, the current user included under `CURRENT_USER_KEY` */
    owners: GlobalOwnerDraft[];
    isUserDirector: boolean | undefined;
    signerFullName: string;
    signerJobTitle: string;
    signerEmail: string;
    secondSignerEmail: string;
    authorizedToBindClientToAgreement: boolean;
    agreeToTermsAndConditions: boolean;
    consentToPrivacyNotice: boolean;
    bankStatement: FileObject[];
    achAuthorizationForm: FileObject[];
};

export type {NonUSDAnswers, OwnerQuestionAnswers, USDAnswers};
