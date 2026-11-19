/**
 * Decides where "Continue with setup" lands in the NonUSD flow. The server stores no step for this flow, so the client
 * guesses it from the fields that are present, and from the draft for the data that is only kept on the device.
 * It mirrors `getStartPageForContinueSetup` of the real flow.
 */
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';
import type {OnboardingForm} from '@pages/SimplifiedBankOnboarding/types/form';
import type {ACHData} from '@pages/SimplifiedBankOnboarding/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

import getInitialSubPageForSignerInfo from './getInitialSubPageForSignerInfo';
import {requiresDocusignStep} from './OnboardingAccountUtils';

type StartPage = {
    page: string;
    subPage?: string;
};

const {PAGE_NAMES, BANK_INFO_SUB_PAGES, BUSINESS_INFO_SUB_PAGES, BENEFICIAL_OWNER_INFO_SUB_PAGES} = SBO_CONST.NON_USD;

function isPastSignerStep(achData: ACHData | undefined, currency: string | undefined): boolean {
    if (achData?.state === SBO_CONST.STATE.VERIFYING) {
        return true;
    }
    const corpay = achData?.corpay;
    const areSignersKnown = currency === SBO_CONST.CURRENCY.AUD ? !!corpay?.signerFullName && !!corpay.secondSignerFullName : !!corpay?.signerFullName;
    return areSignersKnown && corpay?.authorizedToBindClientToAgreement === undefined;
}

function getStartPageForContinueSetup(achData: ACHData | undefined, currency: string | undefined, draft: OnyxEntry<OnboardingForm>): StartPage {
    const corpay = achData?.corpay;
    const isVerifying = achData?.state === SBO_CONST.STATE.VERIFYING;
    const areAllAgreementsChecked =
        !!(draft?.authorizedToBindClientToAgreement ?? corpay?.authorizedToBindClientToAgreement) &&
        !!(draft?.agreeToTermsAndConditions ?? corpay?.agreeToTermsAndConditions) &&
        !!(draft?.consentToPrivacyNotice ?? corpay?.consentToPrivacyNotice);

    // The bank statement is collected on the agreements page and only lives in the draft until the next page sends it.
    const isBankStatementUploaded = !!draft?.[INPUT_IDS.BANK_STATEMENT]?.length;

    if ((draft?.country ?? '') !== '' && achData?.created === undefined) {
        return {page: PAGE_NAMES.BANK_INFO, subPage: BANK_INFO_SUB_PAGES.BANK_ACCOUNT_DETAILS};
    }
    if (achData?.created && corpay?.companyName === undefined) {
        return {page: PAGE_NAMES.BUSINESS_INFO, subPage: BUSINESS_INFO_SUB_PAGES.NAME};
    }
    if (corpay?.companyName && corpay.anyIndividualOwn25PercentOrMore === undefined) {
        return {page: PAGE_NAMES.BENEFICIAL_OWNER_INFO, subPage: BENEFICIAL_OWNER_INFO_SUB_PAGES.IS_USER_BENEFICIAL_OWNER};
    }
    if (!isPastSignerStep(achData, currency)) {
        return {page: PAGE_NAMES.SIGNER_INFO, subPage: getInitialSubPageForSignerInfo(corpay, currency)};
    }
    if (isVerifying) {
        return {page: PAGE_NAMES.FINISH};
    }
    if (areAllAgreementsChecked && requiresDocusignStep(currency) && isBankStatementUploaded) {
        return {page: PAGE_NAMES.DOCUSIGN};
    }
    return {page: PAGE_NAMES.AGREEMENTS};
}

export default getStartPageForContinueSetup;
