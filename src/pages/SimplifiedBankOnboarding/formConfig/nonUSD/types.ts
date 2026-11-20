import type {BaseStepInput} from '@pages/SimplifiedBankOnboarding/formConfig/getBaseStepInput';
import type {NonUSDAnswers} from '@pages/SimplifiedBankOnboarding/model/answers/types';
import type {BankFields, CorpayData, OnboardingPicklists} from '@pages/SimplifiedBankOnboarding/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

/** What every NonUSD step builder reads, computed once per plan */
type NonUSDStepInput = BaseStepInput & {
    answers: NonUSDAnswers;
    corpay: CorpayData | undefined;

    /** The currency of the workspace. It decides the countries, the signers and the docusign step. */
    currency: string;
    isAUD: boolean;

    /** The user confirmed a country, or the server already has one. The default country of AUD does not count. */
    isCountryConfirmed: boolean;
    bankFields: OnyxEntry<BankFields>;
    picklists: OnyxEntry<OnboardingPicklists>;
};

export default NonUSDStepInput;
