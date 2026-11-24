import {requiresDocusignStep} from '@pages/SimplifiedBankOnboarding/contract/currency';
import {isVerifying} from '@pages/SimplifiedBankOnboarding/contract/setupStatus';
import type {FlowData} from '@pages/SimplifiedBankOnboarding/core';

/**
 * The agreements are sent with the last request of the flow, so until the setup is sent the step only counts as done
 * for a currency that has a docusign step after it: all three agreements are checked and the bank statement is picked.
 * The bank statement lives only in the draft until the docusign step sends it.
 */
function areAgreementsComplete({account, draft, currency}: FlowData): boolean {
    const achData = account?.achData;
    if (isVerifying(achData)) {
        return true;
    }
    const corpay = achData?.corpay;
    const areAllAgreementsChecked =
        !!(draft.authorizedToBindClientToAgreement ?? corpay?.authorizedToBindClientToAgreement) &&
        !!(draft.agreeToTermsAndConditions ?? corpay?.agreeToTermsAndConditions) &&
        !!(draft.consentToPrivacyNotice ?? corpay?.consentToPrivacyNotice);
    return areAllAgreementsChecked && requiresDocusignStep(currency) && !!draft.bankStatement?.length;
}

export default areAgreementsComplete;
