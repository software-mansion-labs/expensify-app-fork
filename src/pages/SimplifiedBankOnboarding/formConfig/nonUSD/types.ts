import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type {BankAccountParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {NonUSDAnswers} from '@pages/SimplifiedBankOnboarding/model/answers/types';
import type {ACHData, BankFields, CorpayData, OnboardingAccount, OnboardingPicklists} from '@pages/SimplifiedBankOnboarding/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

/** What every NonUSD step builder reads, computed once per plan */
type NonUSDStepInput = {
    answers: NonUSDAnswers;
    account: OnyxEntry<OnboardingAccount>;
    achData: ACHData | undefined;
    corpay: CorpayData | undefined;

    /** The workspace of the URL, else the workspace of the server data */
    policyID: string | undefined;

    /** Identifies the bank account in the requests of the steps */
    bankAccount: BankAccountParams;

    /** The currency of the workspace. It decides the countries, the signers and the docusign step. */
    currency: string;
    isAUD: boolean;

    /** The user confirmed a country, or the server already has one. The default country of AUD does not count. */
    isCountryConfirmed: boolean;
    bankFields: OnyxEntry<BankFields>;
    picklists: OnyxEntry<OnboardingPicklists>;
    translate: LocalizedTranslate;
};

export default NonUSDStepInput;
