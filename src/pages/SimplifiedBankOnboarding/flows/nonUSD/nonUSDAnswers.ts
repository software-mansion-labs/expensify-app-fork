/**
 * The answers of the NonUSD flow as the steps show them. Every answer is the draft value, then the value that the global
 * provider saved (`achData.corpay`, and `achData` for the country), then an empty default, so an answer that the user
 * changed wins over the saved one (BC-08) and a saved answer is shown after the user comes back.
 */
import useOnyx from '@hooks/useOnyx';

import {getSetupCurrency} from '@pages/SimplifiedBankOnboarding/contract/currency';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import type {GlobalOwnerDraft, OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {BankFieldID, CorpayData, OnboardingAccount} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {useOnboardingFlow} from '@pages/SimplifiedBankOnboarding/core';
import {getGlobalOwnersFromServer} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/serverOwners';

import ONYXKEYS from '@src/ONYXKEYS';
import type {FileObject} from '@src/types/utils/Attachment';

import type {OnyxEntry} from 'react-native-onyx';

type NonUSDAnswers = {
    currency: string;

    /** An AUD account is always Australian, so its country is fixed */
    country: string;
    bankFieldValues: Record<BankFieldID, string>;
    companyName: string;
    businessType: string;

    /** Undefined until the user answered the question or the server saved the owners step */
    ownsMoreThan25Percent: boolean | undefined;

    /** Undefined until the user answered the question or the server saved the owners step */
    anyIndividualOwn25PercentOrMore: boolean | undefined;

    /** Every owner, the user included under `SBO_CONST.NON_USD.CURRENT_USER_KEY` */
    owners: GlobalOwnerDraft[];

    /** Undefined until the user answered the question or the server saved a director */
    isUserDirector: boolean | undefined;
    signerFullName: string;
    signerJobTitle: string;
    authorizedToBindClientToAgreement: boolean;
    agreeToTermsAndConditions: boolean;
    consentToPrivacyNotice: boolean;

    /** Only the draft holds files, the server keeps their names only */
    bankStatement: FileObject[];
    achAuthorizationForm: FileObject[];
};

function getBankFieldValues(draft: OnyxEntry<OnboardingDraft>, corpay: OnyxEntry<CorpayData>): Record<BankFieldID, string> {
    return {
        [INPUT_IDS.IBAN]: draft?.iban ?? corpay?.iban ?? '',
        [INPUT_IDS.SWIFT_BIC_CODE]: draft?.swiftBicCode ?? corpay?.swiftBicCode ?? '',
        [INPUT_IDS.BSB_NUMBER]: draft?.bsbNumber ?? corpay?.bsbNumber ?? '',
        [INPUT_IDS.ACCOUNT_NUMBER]: draft?.accountNumber ?? corpay?.accountNumber ?? '',
        [INPUT_IDS.BANK_NAME]: draft?.bankName ?? corpay?.bankName ?? '',
        [INPUT_IDS.ACCOUNT_HOLDER_NAME]: draft?.accountHolderName ?? corpay?.accountHolderName ?? '',
        [INPUT_IDS.ACCOUNT_HOLDER_COUNTRY]: draft?.accountHolderCountry ?? corpay?.accountHolderCountry ?? '',
        [INPUT_IDS.ACCOUNT_HOLDER_REGION]: draft?.accountHolderRegion ?? corpay?.accountHolderRegion ?? '',
    };
}

/** A saved full name means the user is the director. A saved email without a name means the user invited one. */
function getSavedDirectorAnswer(corpay: OnyxEntry<CorpayData>): boolean | undefined {
    if (corpay?.signerFullName) {
        return true;
    }
    return corpay?.signerEmail ? false : undefined;
}

function getNonUSDAnswers(draft: OnyxEntry<OnboardingDraft>, account: OnyxEntry<OnboardingAccount>, currency: string): NonUSDAnswers {
    const achData = account?.achData;
    const corpay = achData?.corpay;

    return {
        currency,
        country: currency === SBO_CONST.CURRENCY.AUD ? SBO_CONST.COUNTRY.AU : (draft?.country ?? achData?.country ?? ''),
        bankFieldValues: getBankFieldValues(draft, corpay),
        companyName: draft?.companyName ?? corpay?.companyName ?? '',
        businessType: draft?.businessType ?? corpay?.businessType ?? '',
        ownsMoreThan25Percent: draft?.ownsMoreThan25Percent ?? corpay?.ownsMoreThan25Percent,
        anyIndividualOwn25PercentOrMore: draft?.anyIndividualOwn25PercentOrMore ?? corpay?.anyIndividualOwn25PercentOrMore,
        owners: draft?.globalOwners ?? getGlobalOwnersFromServer(corpay),
        isUserDirector: draft?.isUserDirector ?? getSavedDirectorAnswer(corpay),
        signerFullName: draft?.signerFullName ?? corpay?.signerFullName ?? '',
        signerJobTitle: draft?.signerJobTitle ?? corpay?.signerJobTitle ?? '',
        authorizedToBindClientToAgreement: draft?.authorizedToBindClientToAgreement ?? corpay?.authorizedToBindClientToAgreement ?? false,
        agreeToTermsAndConditions: draft?.agreeToTermsAndConditions ?? corpay?.agreeToTermsAndConditions ?? false,
        consentToPrivacyNotice: draft?.consentToPrivacyNotice ?? corpay?.consentToPrivacyNotice ?? false,
        bankStatement: draft?.bankStatement ?? [],
        achAuthorizationForm: draft?.achAuthorizationForm ?? [],
    };
}

function useNonUSDAnswers(): NonUSDAnswers {
    const {target} = useOnboardingFlow();
    const policyID = target.policyID;
    const [account] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT);
    const [draft] = useOnyx(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
    const [workspace] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES, {selector: (workspaces) => (policyID ? workspaces?.[policyID] : undefined)});

    return getNonUSDAnswers(draft, account, getSetupCurrency(workspace, account?.achData, draft));
}

export {getNonUSDAnswers, useNonUSDAnswers};
export type {NonUSDAnswers};
