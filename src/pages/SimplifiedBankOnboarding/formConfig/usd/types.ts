import type {BaseStepInput} from '@pages/SimplifiedBankOnboarding/formConfig/getBaseStepInput';
import type {USDAnswers} from '@pages/SimplifiedBankOnboarding/model/answers/types';

/** What every USD step builder reads, computed once per plan */
type USDStepInput = BaseStepInput & {
    answers: USDAnswers;
};

export default USDStepInput;
