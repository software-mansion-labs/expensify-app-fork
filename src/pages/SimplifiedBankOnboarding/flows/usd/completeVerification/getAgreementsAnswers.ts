/** The agreements of the USD flow: the draft value, then the saved one, and unchecked while neither has one (BC-08) */
import type {FlowData} from '@pages/SimplifiedBankOnboarding/core';

type AgreementsAnswers = {
    isAuthorizedToUseBankAccount: boolean;
    certifyTrueInformation: boolean;
    acceptTermsAndConditions: boolean;
};

function getAgreementsAnswers({draft, account}: FlowData): AgreementsAnswers {
    const achData = account?.achData;

    return {
        isAuthorizedToUseBankAccount: draft.isAuthorizedToUseBankAccount ?? achData?.isAuthorizedToUseBankAccount ?? false,
        certifyTrueInformation: draft.certifyTrueInformation ?? achData?.certifyTrueInformation ?? false,
        acceptTermsAndConditions: draft.acceptTermsAndConditions ?? achData?.acceptTermsAndConditions ?? false,
    };
}

export default getAgreementsAnswers;
