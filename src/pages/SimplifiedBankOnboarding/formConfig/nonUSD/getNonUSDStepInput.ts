import getBaseStepInput from '@pages/SimplifiedBankOnboarding/formConfig/getBaseStepInput';
import type {PlanContext} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import getNonUSDFlowState from '@pages/SimplifiedBankOnboarding/model/getNonUSDFlowState';
import type FlowData from '@pages/SimplifiedBankOnboarding/model/types';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import type NonUSDStepInput from './types';

function getNonUSDStepInput(data: FlowData, {translate, policyID}: PlanContext): NonUSDStepInput {
    const {draft, account, bankFields, picklists} = data;
    const achData = account?.achData;
    const {currency, answers} = getNonUSDFlowState(data, policyID);
    return {
        ...getBaseStepInput(account, policyID, translate),
        answers,
        corpay: achData?.corpay,
        currency,
        isAUD: currency === SBO_CONST.CURRENCY.AUD,
        isCountryConfirmed: !!(draft?.country ?? achData?.country),
        bankFields,
        picklists,
    };
}

export default getNonUSDStepInput;
