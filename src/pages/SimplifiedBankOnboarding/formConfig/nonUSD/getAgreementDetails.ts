import type {NonUSDAnswers} from '@pages/SimplifiedBankOnboarding/model/answers/types';
import type {FinishDetails} from '@pages/SimplifiedBankOnboarding/requests/nonUSD/finishGlobalOnboarding';

/** The answers of the agreements step that the final request sends, from the agreements step or, for AUD, the docusign step */
function getAgreementDetails(answers: NonUSDAnswers): FinishDetails {
    return {
        authorizedToBindClientToAgreement: answers.authorizedToBindClientToAgreement,
        agreeToTermsAndConditions: answers.agreeToTermsAndConditions,
        consentToPrivacyNotice: answers.consentToPrivacyNotice,
    };
}

export default getAgreementDetails;
