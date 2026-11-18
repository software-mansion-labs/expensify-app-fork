import {getCompleteVerificationParams, getCompleteVerificationPrefill} from '@pages/ReimbursementAccount/USD/CompleteVerification/completeVerificationForm';

describe('completeVerificationForm', () => {
    it('sends the agreements the bank account holds, including the terms it keeps under a shorter name', () => {
        // Given a bank account where the user already accepted every agreement
        const achData = {isAuthorizedToUseBankAccount: true, certifyTrueInformation: true, acceptTerms: true};

        // When its answers prefill the form and the form's answers are turned into API params
        const params = getCompleteVerificationParams(getCompleteVerificationPrefill(achData));

        // Then the API gets every agreement as accepted, so a user who comes back does not have to tick the boxes again
        expect(params).toEqual({isAuthorizedToUseBankAccount: true, certifyTrueInformation: true, acceptTermsAndConditions: true});
    });

    it('sends an unanswered agreement as not accepted', () => {
        // Given answers where only one box is ticked
        const answers = {isAuthorizedToUseBankAccount: true};

        // When they are turned into API params
        const params = getCompleteVerificationParams(answers);

        // Then the API gets booleans only, since it takes no missing agreement
        expect(params).toEqual({isAuthorizedToUseBankAccount: true, certifyTrueInformation: false, acceptTermsAndConditions: false});
    });
});
