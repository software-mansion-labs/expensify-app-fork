/**
 * The answers of the NonUSD flow: one flat object with every value the plan builder reads. Each value is the draft value
 * when the user typed one, else the value that the server saved. Questions stay undefined until either side answered them.
 */
import type {GlobalOwnerDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {SetupType} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import type {OwnerQuestionAnswers} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/types';

import type {FileObject} from '@src/types/utils/Attachment';

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

export default NonUSDAnswers;
