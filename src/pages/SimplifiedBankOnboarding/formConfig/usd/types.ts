import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {BankAccountParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {USDAnswers} from '@pages/SimplifiedBankOnboarding/model/answers/types';
import type {ACHData, OnboardingAccount} from '@pages/SimplifiedBankOnboarding/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

/** What every USD step builder reads, computed once per plan */
type USDStepInput = {
    answers: USDAnswers;
    account: OnyxEntry<OnboardingAccount>;
    achData: ACHData | undefined;

    /** The workspace of the URL, else the workspace of the server data */
    policyID: string | undefined;

    /** Identifies the bank account in the requests of the steps */
    bankAccount: BankAccountParams;
    translate: LocalizedTranslate;
};

export default USDStepInput;
