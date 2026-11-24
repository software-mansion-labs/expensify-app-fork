/**
 * The NonUSD step that opens when the URL names none. The server stores no step for this flow, so the step is guessed
 * from the fields that the server saved, and from the draft for the data that only the device keeps. It mirrors
 * `getStartPageForContinueSetup` of the real flow and returns the step only: the step itself picks its page.
 */
import {requiresDocusignStep} from '@pages/SimplifiedBankOnboarding/contract/currency';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {NonUSDStepID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import type {ACHData, OnboardingAccount} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {areSignersKnown, isGlobalAccountCreated, isVerifying} from '@pages/SimplifiedBankOnboarding/contract/setupStatus';

import type {OnyxEntry} from 'react-native-onyx';

const {PAGE_NAMES} = SBO_CONST.NON_USD;

/** The signer step is done once every director is known and the agreements were not sent yet, or once the setup was sent */
function isPastSignerStep(achData: OnyxEntry<ACHData>, currency: string): boolean {
    if (isVerifying(achData)) {
        return true;
    }
    return areSignersKnown(achData?.corpay, currency) && achData?.corpay?.authorizedToBindClientToAgreement === undefined;
}

function areAllAgreementsChecked(draft: OnyxEntry<OnboardingDraft>, achData: OnyxEntry<ACHData>): boolean {
    const corpay = achData?.corpay;
    return (
        !!(draft?.authorizedToBindClientToAgreement ?? corpay?.authorizedToBindClientToAgreement) &&
        !!(draft?.agreeToTermsAndConditions ?? corpay?.agreeToTermsAndConditions) &&
        !!(draft?.consentToPrivacyNotice ?? corpay?.consentToPrivacyNotice)
    );
}

function getNonUSDResumeStep(account: OnyxEntry<OnboardingAccount>, draft: OnyxEntry<OnboardingDraft>, currency: string): NonUSDStepID {
    const achData = account?.achData;
    const corpay = achData?.corpay;

    // Before the bank step created the account, only a picked country moves the setup past the first step
    if (!isGlobalAccountCreated(achData)) {
        return draft?.country ? PAGE_NAMES.BANK_INFO : PAGE_NAMES.COUNTRY;
    }
    if (achData?.created && corpay?.companyName === undefined) {
        return PAGE_NAMES.BUSINESS_INFO;
    }
    if (corpay?.companyName && corpay.anyIndividualOwn25PercentOrMore === undefined) {
        return PAGE_NAMES.BENEFICIAL_OWNER_INFO;
    }
    if (!isPastSignerStep(achData, currency)) {
        return PAGE_NAMES.SIGNER_INFO;
    }
    if (isVerifying(achData)) {
        return PAGE_NAMES.FINISH;
    }

    // The bank statement is picked on the agreements step and only lives in the draft until the docusign step sends it
    if (areAllAgreementsChecked(draft, achData) && requiresDocusignStep(currency) && !!draft?.bankStatement?.length) {
        return PAGE_NAMES.DOCUSIGN;
    }
    return PAGE_NAMES.AGREEMENTS;
}

export default getNonUSDResumeStep;
