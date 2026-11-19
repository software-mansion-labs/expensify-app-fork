/**
 * The docusign step, only for currencies that need a signed authorization form. It sends the final request with the
 * agreements and the bank statement of the previous step. The mock server receives only the names of the files.
 */
import getCorpayFileField from '@pages/SimplifiedBankOnboarding/formConfig/fields/getCorpayFileField';
import type {StepConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import finishGlobalOnboarding from '@pages/SimplifiedBankOnboarding/requests/nonUSD/finishGlobalOnboarding';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

import type NonUSDStepInput from './types';

import getAgreementDetails from './getAgreementDetails';
import isOnboardingSent from './isOnboardingSent';

function getDocusignStep({answers, achData, bankAccount, translate}: NonUSDStepInput): StepConfig {
    const isSent = isOnboardingSent(achData);
    return {
        id: SBO_CONST.NON_USD.PAGE_NAMES.DOCUSIGN,
        title: translate('docusignStep.subheader'),
        counterIndex: 6,
        isComplete: isSent,
        pages: [
            {
                kind: 'form',
                id: SBO_CONST.NON_USD.DOCUSIGN_SUB_PAGES.UPLOAD,
                isComplete: isSent,
                title: translate('docusignStep.pleaseCompleteTheBusinessAccount'),
                description: translate('docusignStep.pleaseUploadTheDirect'),
                fields: [getCorpayFileField(INPUT_IDS.ACH_AUTHORIZATION_FORM, translate('docusignStep.subheader'), undefined, answers.achAuthorizationForm)],
                submitLabel: translate('common.submit'),
                enabledWhenOffline: false,
            },
        ],
        submit: () =>
            finishGlobalOnboarding(bankAccount, {
                ...getAgreementDetails(answers),
                bankStatementName: answers.bankStatement.at(0)?.name,
                achAuthorizationFormName: answers.achAuthorizationForm.at(0)?.name,
            }),
        requestName: REQUEST_NAMES.FINISH_GLOBAL_ONBOARDING,
    };
}

export default getDocusignStep;
