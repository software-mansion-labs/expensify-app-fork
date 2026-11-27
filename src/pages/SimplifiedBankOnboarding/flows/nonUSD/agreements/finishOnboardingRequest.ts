import {requiresDocusignStep} from '@pages/SimplifiedBankOnboarding/contract/currency';
import type {OnboardingRequest} from '@pages/SimplifiedBankOnboarding/core';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

import getAgreementsAnswers from './getAgreementsAnswers';

/**
 * Ends the setup with the agreement answers. The agreements step sends it when no docusign step follows, else the
 * docusign step sends it together with the names of the two files. The server gets only the names, because the real
 * flow uploads the files.
 */
const finishOnboardingRequest: OnboardingRequest = {
    name: 'nonUSD.agreements.finish',
    build: (data) => {
        const answers = getAgreementsAnswers(data);
        const fileNames = requiresDocusignStep(data.currency)
            ? {
                  bankStatementName: answers.bankStatement.at(0)?.name,
                  achAuthorizationFormName: answers.achAuthorizationForm.at(0)?.name,
              }
            : {};
        return {
            type: 'write',
            command: WRITE_COMMANDS.FINISH_GLOBAL_BANK_ACCOUNT_ONBOARDING,
            params: {
                ...data.bankAccount,
                authorizedToBindClientToAgreement: answers.authorizedToBindClientToAgreement,
                agreeToTermsAndConditions: answers.agreeToTermsAndConditions,
                consentToPrivacyNotice: answers.consentToPrivacyNotice,
                ...fileNames,
            },
        };
    },
};

export default finishOnboardingRequest;
