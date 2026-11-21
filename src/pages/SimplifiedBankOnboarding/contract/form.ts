/**
 * Form types of the simplified bank onboarding. One form holds the inputs of every step of both flows. Its draft is the
 * only store of what the user typed: the flow reads its answers from the draft first and from the server data second.
 */
import type Form from '@src/types/form/Form';
import type {FileObject} from '@src/types/utils/Attachment';

import type {ValueOf} from 'type-fest';

import type {SetupType} from './onyx';

const INPUT_IDS = {
    COUNTRY: 'country',

    // USD bank account
    ROUTING_NUMBER: 'routingNumber',
    ACCOUNT_NUMBER: 'accountNumber',
    PLAID_ACCOUNT_ID: 'plaidAccountID',

    // USD requestor
    FIRST_NAME: 'firstName',
    LAST_NAME: 'lastName',
    DOB: 'dob',
    SSN_LAST_4: 'ssnLast4',
    IS_ONFIDO_SETUP_COMPLETE: 'isOnfidoSetupComplete',

    // Company, shared by both flows
    COMPANY_NAME: 'companyName',
    COMPANY_TAX_ID: 'companyTaxID',
    INCORPORATION_TYPE: 'incorporationType',
    BUSINESS_TYPE: 'businessType',

    // Beneficial owners
    OWNS_MORE_THAN_25_PERCENT: 'ownsMoreThan25Percent',
    HAS_OTHER_BENEFICIAL_OWNERS: 'hasOtherBeneficialOwners',
    HAS_MORE_BENEFICIAL_OWNERS: 'hasMoreBeneficialOwners',

    // The owner that the owner pages edit. The confirmation page copies it into the owner list of the draft.
    OWNER_FIRST_NAME: 'ownerFirstName',
    OWNER_LAST_NAME: 'ownerLastName',
    OWNER_DOB: 'ownerDob',
    OWNER_OWNERSHIP_PERCENTAGE: 'ownerOwnershipPercentage',

    // USD agreements
    IS_AUTHORIZED_TO_USE_BANK_ACCOUNT: 'isAuthorizedToUseBankAccount',
    CERTIFY_TRUE_INFORMATION: 'certifyTrueInformation',
    ACCEPT_TERMS_AND_CONDITIONS: 'acceptTermsAndConditions',

    // USD KYB documents
    COMPANY_TAX_ID_DOCUMENT: 'companyTaxIDDocument',
    COMPANY_ADDRESS_DOCUMENT: 'companyAddressDocument',

    // USD micro-deposit validation
    AMOUNT_1: 'amount1',
    AMOUNT_2: 'amount2',
    AMOUNT_3: 'amount3',

    // NonUSD bank account, the server decides which of these a country needs
    IBAN: 'iban',
    SWIFT_BIC_CODE: 'swiftBicCode',
    BSB_NUMBER: 'bsbNumber',
    BANK_NAME: 'bankName',
    ACCOUNT_HOLDER_NAME: 'accountHolderName',
    ACCOUNT_HOLDER_COUNTRY: 'accountHolderCountry',
    ACCOUNT_HOLDER_REGION: 'accountHolderRegion',

    // NonUSD signer
    IS_USER_DIRECTOR: 'isUserDirector',
    SIGNER_FULL_NAME: 'signerFullName',
    SIGNER_JOB_TITLE: 'signerJobTitle',
    SIGNER_EMAIL: 'signerEmail',
    SECOND_SIGNER_EMAIL: 'secondSignerEmail',

    // NonUSD agreements
    AUTHORIZED_TO_BIND_CLIENT_TO_AGREEMENT: 'authorizedToBindClientToAgreement',
    AGREE_TO_TERMS_AND_CONDITIONS: 'agreeToTermsAndConditions',
    CONSENT_TO_PRIVACY_NOTICE: 'consentToPrivacyNotice',
    BANK_STATEMENT: 'bankStatement',
    ACH_AUTHORIZATION_FORM: 'achAuthorizationForm',
} as const;

type InputID = ValueOf<typeof INPUT_IDS>;

/** A USD beneficial owner as the draft keeps it until the owners step sends the list */
type USDOwnerDraft = {
    id: string;
    firstName: string;
    lastName: string;
    dob: string;
};

/** A NonUSD beneficial owner as the draft keeps it. The current user has the fixed ID `SBO_CONST.NON_USD.CURRENT_USER_KEY`. */
type GlobalOwnerDraft = {
    id: string;
    firstName: string;
    lastName: string;
    ownershipPercentage: string;
};

/** Draft values that are not inputs: choices made outside a form and the owner lists */
type OnboardingFormExtraProps = {
    /** The setup type that the user picked on the entry page. It decides which bank account page the flow shows. */
    setupType?: SetupType;
    usdOwners?: USDOwnerDraft[];
    globalOwners?: GlobalOwnerDraft[];

    /** The owner that the owner pages edit. Undefined while the user adds a new owner. */
    ownerBeingModifiedID?: string | null;

    /** The currency of a setup that replaces a connected bank account, which the workspace may not name */
    currency?: string;
};

type OnboardingForm = OnboardingFormExtraProps &
    Form<
        InputID,
        {
            [INPUT_IDS.COUNTRY]: string;
            [INPUT_IDS.ROUTING_NUMBER]: string;
            [INPUT_IDS.ACCOUNT_NUMBER]: string;
            [INPUT_IDS.PLAID_ACCOUNT_ID]: string;
            [INPUT_IDS.FIRST_NAME]: string;
            [INPUT_IDS.LAST_NAME]: string;
            [INPUT_IDS.DOB]: string;
            [INPUT_IDS.SSN_LAST_4]: string;
            [INPUT_IDS.IS_ONFIDO_SETUP_COMPLETE]: boolean;
            [INPUT_IDS.COMPANY_NAME]: string;
            [INPUT_IDS.COMPANY_TAX_ID]: string;
            [INPUT_IDS.INCORPORATION_TYPE]: string;
            [INPUT_IDS.BUSINESS_TYPE]: string;
            [INPUT_IDS.OWNS_MORE_THAN_25_PERCENT]: boolean;
            [INPUT_IDS.HAS_OTHER_BENEFICIAL_OWNERS]: boolean;
            [INPUT_IDS.HAS_MORE_BENEFICIAL_OWNERS]: boolean;
            [INPUT_IDS.OWNER_FIRST_NAME]: string;
            [INPUT_IDS.OWNER_LAST_NAME]: string;
            [INPUT_IDS.OWNER_DOB]: string;
            [INPUT_IDS.OWNER_OWNERSHIP_PERCENTAGE]: string;
            [INPUT_IDS.IS_AUTHORIZED_TO_USE_BANK_ACCOUNT]: boolean;
            [INPUT_IDS.CERTIFY_TRUE_INFORMATION]: boolean;
            [INPUT_IDS.ACCEPT_TERMS_AND_CONDITIONS]: boolean;
            [INPUT_IDS.COMPANY_TAX_ID_DOCUMENT]: FileObject[];
            [INPUT_IDS.COMPANY_ADDRESS_DOCUMENT]: FileObject[];
            [INPUT_IDS.AMOUNT_1]: string;
            [INPUT_IDS.AMOUNT_2]: string;
            [INPUT_IDS.AMOUNT_3]: string;
            [INPUT_IDS.IBAN]: string;
            [INPUT_IDS.SWIFT_BIC_CODE]: string;
            [INPUT_IDS.BSB_NUMBER]: string;
            [INPUT_IDS.BANK_NAME]: string;
            [INPUT_IDS.ACCOUNT_HOLDER_NAME]: string;
            [INPUT_IDS.ACCOUNT_HOLDER_COUNTRY]: string;
            [INPUT_IDS.ACCOUNT_HOLDER_REGION]: string;
            [INPUT_IDS.IS_USER_DIRECTOR]: boolean;
            [INPUT_IDS.SIGNER_FULL_NAME]: string;
            [INPUT_IDS.SIGNER_JOB_TITLE]: string;
            [INPUT_IDS.SIGNER_EMAIL]: string;
            [INPUT_IDS.SECOND_SIGNER_EMAIL]: string;
            [INPUT_IDS.AUTHORIZED_TO_BIND_CLIENT_TO_AGREEMENT]: boolean;
            [INPUT_IDS.AGREE_TO_TERMS_AND_CONDITIONS]: boolean;
            [INPUT_IDS.CONSENT_TO_PRIVACY_NOTICE]: boolean;
            [INPUT_IDS.BANK_STATEMENT]: FileObject[];
            [INPUT_IDS.ACH_AUTHORIZATION_FORM]: FileObject[];
        }
    >;

/** The draft as Onyx holds it. Any input may be missing until the user typed it. */
type OnboardingDraft = Partial<OnboardingForm>;

/** The inputs whose value has the given type, so a field can only point at an input that holds its kind of value */
type InputIDWithValue<TValue> = {
    [TID in InputID]: OnboardingForm[TID] extends TValue ? TID : never;
}[InputID];

type TextInputID = InputIDWithValue<string>;
type BooleanInputID = InputIDWithValue<boolean>;
type FileInputID = InputIDWithValue<FileObject[]>;

const SIGNER_INPUT_IDS = {
    SIGNER_FULL_NAME: 'signerFullName',
    SIGNER_JOB_TITLE: 'signerJobTitle',
} as const;

type SignerInputID = ValueOf<typeof SIGNER_INPUT_IDS>;

/** The form that an invited director fills in, a separate copy of the signer inputs. Its request state is in the request status key. */
type EnterSignerInfoForm = Form<
    SignerInputID,
    {
        [SIGNER_INPUT_IDS.SIGNER_FULL_NAME]: string;
        [SIGNER_INPUT_IDS.SIGNER_JOB_TITLE]: string;
    }
>;

export type {BooleanInputID, EnterSignerInfoForm, FileInputID, GlobalOwnerDraft, InputID, OnboardingDraft, OnboardingForm, TextInputID, USDOwnerDraft};
export {SIGNER_INPUT_IDS};
export default INPUT_IDS;
