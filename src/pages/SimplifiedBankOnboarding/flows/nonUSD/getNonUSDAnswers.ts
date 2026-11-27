/**
 * Builds the NonUSD answers. One rule for every value: a draft value that is not undefined wins over the server value.
 * The owner list comes from the draft when the draft has one, else from the owners that the server saved.
 */
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {CorpayData, OnboardingAccount} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import getOwnerBufferAnswers from '@pages/SimplifiedBankOnboarding/flows/shared/owners/getOwnerBufferAnswers';
import {getGlobalOwnersFromServer} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/serverOwners';

import type {OnyxEntry} from 'react-native-onyx';

import type NonUSDAnswers from './NonUSDAnswers';

/**
 * The server does not store whether the user is the director. A saved signer email means the user invited someone else,
 * a saved signer name without one means the user signed as the director.
 */
function getServerIsUserDirector(corpay: CorpayData | undefined): boolean | undefined {
    if (corpay?.signerEmail !== undefined) {
        return false;
    }
    if (corpay?.signerFullName !== undefined) {
        return true;
    }
    return undefined;
}

/** AUD accounts can only be in Australia, so the country has an answer before the user picks one */
function getDefaultCountry(currency: string | undefined): string {
    return currency === SBO_CONST.CURRENCY.AUD ? SBO_CONST.COUNTRY.AU : '';
}

function getNonUSDAnswers(draft: OnboardingDraft | undefined, account: OnyxEntry<OnboardingAccount>, currency: string | undefined): NonUSDAnswers {
    const achData = account?.achData;
    const corpay = achData?.corpay;

    return {
        ...getOwnerBufferAnswers(draft),
        setupType: draft?.setupType ?? (achData?.subStep || undefined),
        country: draft?.country ?? achData?.country ?? getDefaultCountry(currency),
        iban: draft?.iban ?? corpay?.iban ?? '',
        swiftBicCode: draft?.swiftBicCode ?? corpay?.swiftBicCode ?? '',
        bsbNumber: draft?.bsbNumber ?? corpay?.bsbNumber ?? '',
        accountNumber: draft?.accountNumber ?? corpay?.accountNumber ?? '',
        bankName: draft?.bankName ?? corpay?.bankName ?? '',
        accountHolderName: draft?.accountHolderName ?? corpay?.accountHolderName ?? '',
        accountHolderCountry: draft?.accountHolderCountry ?? corpay?.accountHolderCountry ?? '',
        accountHolderRegion: draft?.accountHolderRegion ?? corpay?.accountHolderRegion ?? '',
        companyName: draft?.companyName ?? corpay?.companyName ?? '',
        businessType: draft?.businessType ?? corpay?.businessType ?? '',
        ownsMoreThan25Percent: draft?.ownsMoreThan25Percent ?? corpay?.ownsMoreThan25Percent,
        hasOtherBeneficialOwners: draft?.hasOtherBeneficialOwners ?? corpay?.anyIndividualOwn25PercentOrMore,
        hasMoreBeneficialOwners: draft?.hasMoreBeneficialOwners,
        ownerBeingModifiedID: draft?.ownerBeingModifiedID ?? null,
        owners: draft?.globalOwners ?? getGlobalOwnersFromServer(corpay),
        isUserDirector: draft?.isUserDirector ?? getServerIsUserDirector(corpay),
        signerFullName: draft?.signerFullName ?? corpay?.signerFullName ?? '',
        signerJobTitle: draft?.signerJobTitle ?? corpay?.signerJobTitle ?? '',
        signerEmail: draft?.signerEmail ?? corpay?.signerEmail ?? '',
        secondSignerEmail: draft?.secondSignerEmail ?? corpay?.secondSignerEmail ?? '',
        authorizedToBindClientToAgreement: draft?.authorizedToBindClientToAgreement ?? corpay?.authorizedToBindClientToAgreement ?? false,
        agreeToTermsAndConditions: draft?.agreeToTermsAndConditions ?? corpay?.agreeToTermsAndConditions ?? false,
        consentToPrivacyNotice: draft?.consentToPrivacyNotice ?? corpay?.consentToPrivacyNotice ?? false,
        bankStatement: draft?.bankStatement ?? [],
        achAuthorizationForm: draft?.achAuthorizationForm ?? [],
    };
}

export default getNonUSDAnswers;
