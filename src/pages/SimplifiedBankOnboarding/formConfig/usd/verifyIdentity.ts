import type {StepConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import getRequestKey from '@pages/SimplifiedBankOnboarding/requests/requestKey';
import {verifyIdentity} from '@pages/SimplifiedBankOnboarding/requests/usd/identityCheck';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import type USDStepInput from './types';

/** The mock stands in for the result that the Onfido widget returns */
const MOCK_ONFIDO_DATA = 'mock-onfido-data';

/** The identity check. The plan only holds it while the server has not finished the check. */
function getVerifyIdentityStep({bankAccount, translate}: USDStepInput): StepConfig {
    return {
        id: SBO_CONST.USD.PAGE_NAMES.VERIFY_IDENTITY,
        title: translate('onfidoStep.verifyIdentity'),
        counterIndex: SBO_CONST.USD.STEP_INDEX.PERSONAL_INFO,
        isComplete: false,
        pages: [{kind: 'custom', id: SBO_CONST.USD.VERIFY_IDENTITY_SUB_PAGES.IDENTITY_CHECK, component: 'onfido', isComplete: false}],
        submit: () => verifyIdentity(bankAccount, MOCK_ONFIDO_DATA),
        requestKey: getRequestKey(REQUEST_NAMES.VERIFY_IDENTITY, bankAccount),
    };
}

export default getVerifyIdentityStep;
