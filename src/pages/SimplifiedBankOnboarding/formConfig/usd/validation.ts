import type {StepConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import {isPendingValidation} from '@pages/SimplifiedBankOnboarding/model/setupStatus';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import type USDStepInput from './types';

import hasPassedServerStep from './hasPassedServerStep';

/**
 * The last step: the review, the test deposits and the connected account. Its custom page sends its own requests, so
 * the step has no submit. While the account waits for the deposits, Back leaves the flow, because the earlier steps
 * are already sent.
 */
function getValidationStep({achData, translate}: USDStepInput): StepConfig {
    const isPending = isPendingValidation(achData);
    return {
        id: SBO_CONST.USD.PAGE_NAMES.VALIDATION,
        title: isPending ? translate('connectBankAccountStep.validateYourBankAccount') : translate('bankAccount.addBankAccount'),
        counterIndex: 6,
        isComplete: hasPassedServerStep(achData, SBO_CONST.USD.STEP.VALIDATION),
        pages: [{kind: 'custom', id: SBO_CONST.USD.VALIDATION_SUB_PAGES.VALIDATE, component: 'validation', isComplete: false, shouldExitOnBack: isPending}],
        requestName: REQUEST_NAMES.VALIDATE_BANK_ACCOUNT,
    };
}

export default getValidationStep;
