import {requiresDocusignStep} from '@pages/SimplifiedBankOnboarding/contract/currency';
import {isVerifying} from '@pages/SimplifiedBankOnboarding/contract/setupStatus';
import type {FlowData} from '@pages/SimplifiedBankOnboarding/core';

import getAgreementsAnswers from './getAgreementsAnswers';

/**
 * The agreements are sent with the last request of the flow, so until the setup is sent the step only counts as done
 * for a currency that has a docusign step after it: all three agreements are checked and the bank statement is picked.
 * The bank statement lives only in the draft until the docusign step sends it.
 */
function areAgreementsComplete(data: FlowData): boolean {
    if (isVerifying(data.account?.achData)) {
        return true;
    }
    const answers = getAgreementsAnswers(data);
    const areAllAgreementsChecked = answers.authorizedToBindClientToAgreement && answers.agreeToTermsAndConditions && answers.consentToPrivacyNotice;
    return areAllAgreementsChecked && requiresDocusignStep(data.currency) && answers.bankStatement.length > 0;
}

export default areAgreementsComplete;
