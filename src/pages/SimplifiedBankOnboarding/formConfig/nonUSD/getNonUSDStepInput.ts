import type {FlowData} from '@pages/SimplifiedBankOnboarding/controller/types';
import type {PlanContext} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import getNonUSDAnswers from '@pages/SimplifiedBankOnboarding/model/answers/getNonUSDAnswers';
import getNonUSDCurrency from '@pages/SimplifiedBankOnboarding/model/getNonUSDCurrency';
import getBankAccountParams from '@pages/SimplifiedBankOnboarding/requests/getBankAccountParams';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import type NonUSDStepInput from './types';

function getNonUSDStepInput({draft, account, workspaces, bankFields, picklists}: FlowData, {translate, policyID}: PlanContext): NonUSDStepInput {
    const achData = account?.achData;
    const resolvedPolicyID = policyID ?? achData?.policyID;
    const currency = getNonUSDCurrency(workspaces, resolvedPolicyID, achData, draft);
    return {
        answers: getNonUSDAnswers(draft, account, currency),
        account,
        achData,
        corpay: achData?.corpay,
        policyID: resolvedPolicyID,
        bankAccount: getBankAccountParams(resolvedPolicyID, achData),
        currency,
        isAUD: currency === SBO_CONST.CURRENCY.AUD,
        isCountryConfirmed: !!(draft?.country ?? achData?.country),
        bankFields,
        picklists,
        translate,
    };
}

export default getNonUSDStepInput;
