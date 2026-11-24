/**
 * The answers of the USD flow as the steps show them. Every answer is the draft value, then the value that the server
 * saved, then an empty default, so an answer that the user changed wins over the saved one and a saved answer is shown
 * after the user comes back. The status values come from the server only.
 */
import useOnyx from '@hooks/useOnyx';

import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import type {OnboardingDraft, USDOwnerDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {KYBDocumentType, OnboardingAccount, SetupType} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import {areCompanyDetailsLocked, isVerifying} from '@pages/SimplifiedBankOnboarding/contract/setupStatus';
import {getUSDOwnersFromServer} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/serverOwners';

import ONYXKEYS from '@src/ONYXKEYS';
import type {FileObject} from '@src/types/utils/Attachment';

import type {OnyxEntry} from 'react-native-onyx';

type KYBFileInputID = typeof INPUT_IDS.COMPANY_TAX_ID_DOCUMENT | typeof INPUT_IDS.COMPANY_ADDRESS_DOCUMENT;

type USDAnswers = {
    /** Plaid or manual. The draft holds the option that the user picked on the entry page. */
    setupType: SetupType | undefined;
    routingNumber: string;
    accountNumber: string;
    plaidAccountID: string;
    firstName: string;
    lastName: string;
    dob: string;
    ssnLast4: string;
    companyName: string;
    companyTaxID: string;
    incorporationType: string;

    /** Undefined until the user answered the question or the server saved the owners step */
    ownsMoreThan25Percent: boolean | undefined;

    /** Undefined until the user answered the question or the server saved the owners step */
    hasOtherBeneficialOwners: boolean | undefined;

    /** The owners other than the user */
    owners: USDOwnerDraft[];
    isAuthorizedToUseBankAccount: boolean;
    certifyTrueInformation: boolean;
    acceptTermsAndConditions: boolean;

    /** The picked files of each document input. Only the draft holds files, the server keeps their names only. */
    kybFiles: Record<KYBFileInputID, FileObject[]>;
    isVerifying: boolean;
    areCompanyDetailsLocked: boolean;
    isOnfidoSetupComplete: boolean;
    requiredKYBDocuments: KYBDocumentType[];
};

/** A text input shows an empty value while neither the user nor the server gave an answer */
function getTextAnswer(draftValue: string | undefined, serverValue: string | undefined): string {
    return draftValue ?? serverValue ?? '';
}

function getUSDAnswers(draft: OnyxEntry<OnboardingDraft>, account: OnyxEntry<OnboardingAccount>): USDAnswers {
    const achData = account?.achData;
    const hasSavedOwners = achData?.ownsMoreThan25Percent !== undefined;

    return {
        setupType: draft?.setupType ?? (achData?.subStep || undefined),
        routingNumber: getTextAnswer(draft?.routingNumber, achData?.routingNumber),
        accountNumber: getTextAnswer(draft?.accountNumber, achData?.accountNumber),
        plaidAccountID: getTextAnswer(draft?.plaidAccountID, achData?.plaidAccountID),
        firstName: getTextAnswer(draft?.firstName, achData?.firstName),
        lastName: getTextAnswer(draft?.lastName, achData?.lastName),
        dob: getTextAnswer(draft?.dob, achData?.dob),
        ssnLast4: getTextAnswer(draft?.ssnLast4, achData?.ssnLast4),
        companyName: getTextAnswer(draft?.companyName, achData?.companyName),
        companyTaxID: getTextAnswer(draft?.companyTaxID, achData?.companyTaxID),
        incorporationType: getTextAnswer(draft?.incorporationType, achData?.incorporationType),
        ownsMoreThan25Percent: draft?.ownsMoreThan25Percent ?? achData?.ownsMoreThan25Percent,

        // The server has no answer of its own for this question: the saved owners step answered yes when it saved owners
        hasOtherBeneficialOwners: draft?.hasOtherBeneficialOwners ?? (hasSavedOwners ? (achData?.beneficialOwners?.length ?? 0) > 0 : undefined),
        owners: draft?.usdOwners ?? getUSDOwnersFromServer(achData),
        isAuthorizedToUseBankAccount: draft?.isAuthorizedToUseBankAccount ?? achData?.isAuthorizedToUseBankAccount ?? false,
        certifyTrueInformation: draft?.certifyTrueInformation ?? achData?.certifyTrueInformation ?? false,
        acceptTermsAndConditions: draft?.acceptTermsAndConditions ?? achData?.acceptTermsAndConditions ?? false,
        kybFiles: {
            [INPUT_IDS.COMPANY_TAX_ID_DOCUMENT]: draft?.companyTaxIDDocument ?? [],
            [INPUT_IDS.COMPANY_ADDRESS_DOCUMENT]: draft?.companyAddressDocument ?? [],
        },
        isVerifying: isVerifying(achData),
        areCompanyDetailsLocked: areCompanyDetailsLocked(achData),
        isOnfidoSetupComplete: !!achData?.isOnfidoSetupComplete,
        requiredKYBDocuments: achData?.requiredKYBDocuments ?? [],
    };
}

function useUSDAnswers(): USDAnswers {
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
    return getUSDAnswers(draft, account);
}

export {getUSDAnswers, useUSDAnswers};
export type {KYBFileInputID, USDAnswers};
