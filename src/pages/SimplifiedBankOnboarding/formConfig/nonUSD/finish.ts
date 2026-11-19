import type {StepConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import type NonUSDStepInput from './types';

/** The last page shows the state of the review. It never counts as complete, so the flow resumes there once all is sent. */
function getFinishStep({translate}: NonUSDStepInput): StepConfig {
    return {
        id: SBO_CONST.NON_USD.PAGE_NAMES.FINISH,
        title: translate('bankAccount.addBankAccount'),
        isComplete: false,
        pages: [{kind: 'custom', id: SBO_CONST.NON_USD.FINISH_SUB_PAGES.DONE, component: 'finish', isComplete: false, shouldExitOnBack: true}],
    };
}

export default getFinishStep;
