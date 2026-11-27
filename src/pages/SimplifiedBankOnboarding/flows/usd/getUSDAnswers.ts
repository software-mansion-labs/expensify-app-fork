/**
 * Builds the USD answers. One rule for every value: a draft value that is not undefined wins over the server value.
 * The owner list comes from the draft when the draft has one, else from the owners that the server saved.
 */
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {OnboardingAccount} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import getOwnerBufferAnswers from '@pages/SimplifiedBankOnboarding/flows/shared/owners/getOwnerBufferAnswers';
import {getUSDOwnersFromServer} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/serverOwners';

import type {OnyxEntry} from 'react-native-onyx';

import type USDAnswers from './USDAnswers';

function getUSDAnswers(draft: OnboardingDraft | undefined, account: OnyxEntry<OnboardingAccount>): USDAnswers {
    const achData = account?.achData;
    const serverOwners = getUSDOwnersFromServer(achData);

    // The server has no answer to this question. Once the owners step was saved, the saved list answers it.
    const serverHasOtherOwners = achData?.ownsMoreThan25Percent === undefined ? undefined : serverOwners.length > 0;

    return {
        ...getOwnerBufferAnswers(draft),
        setupType: draft?.setupType ?? (achData?.subStep || undefined),
        country: draft?.country ?? achData?.country ?? '',
        routingNumber: draft?.routingNumber ?? achData?.routingNumber ?? '',
        accountNumber: draft?.accountNumber ?? achData?.accountNumber ?? '',
        plaidAccountID: draft?.plaidAccountID ?? achData?.plaidAccountID,
        firstName: draft?.firstName ?? achData?.firstName ?? '',
        lastName: draft?.lastName ?? achData?.lastName ?? '',
        dob: draft?.dob ?? achData?.dob ?? '',
        ssnLast4: draft?.ssnLast4 ?? achData?.ssnLast4 ?? '',
        companyName: draft?.companyName ?? achData?.companyName ?? '',
        // eslint-disable-next-line rulesdir/no-default-id-values -- A tax ID number is a form value, not a reference to an entity
        companyTaxID: draft?.companyTaxID ?? achData?.companyTaxID ?? '',
        incorporationType: draft?.incorporationType ?? achData?.incorporationType ?? '',
        ownsMoreThan25Percent: draft?.ownsMoreThan25Percent ?? achData?.ownsMoreThan25Percent,
        hasOtherBeneficialOwners: draft?.hasOtherBeneficialOwners ?? serverHasOtherOwners,
        hasMoreBeneficialOwners: draft?.hasMoreBeneficialOwners,
        ownerBeingModifiedID: draft?.ownerBeingModifiedID ?? null,
        owners: draft?.usdOwners ?? serverOwners,
        isAuthorizedToUseBankAccount: draft?.isAuthorizedToUseBankAccount ?? achData?.isAuthorizedToUseBankAccount ?? false,
        certifyTrueInformation: draft?.certifyTrueInformation ?? achData?.certifyTrueInformation ?? false,
        acceptTermsAndConditions: draft?.acceptTermsAndConditions ?? achData?.acceptTermsAndConditions ?? false,
        companyTaxIDDocument: draft?.companyTaxIDDocument ?? [],
        companyAddressDocument: draft?.companyAddressDocument ?? [],
        amount1: draft?.amount1 ?? '',
        amount2: draft?.amount2 ?? '',
        amount3: draft?.amount3 ?? '',
    };
}

export default getUSDAnswers;
