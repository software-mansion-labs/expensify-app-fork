/**
 * Reads the server lists that describe the NonUSD forms: the bank inputs of the chosen country and currency, and the
 * picklists of the business step. The plan shows a loader until they arrive, so the reads run from the screen.
 */
import useNetwork from '@hooks/useNetwork';

import type {FlowData} from '@pages/SimplifiedBankOnboarding/controller/types';
import getNonUSDAnswers from '@pages/SimplifiedBankOnboarding/model/answers/getNonUSDAnswers';
import areBankFieldsLoaded from '@pages/SimplifiedBankOnboarding/model/bankFields/areBankFieldsLoaded';
import getNonUSDCurrency from '@pages/SimplifiedBankOnboarding/model/getNonUSDCurrency';
import {getBankAccountFields, getOnboardingFields} from '@pages/SimplifiedBankOnboarding/requests/nonUSD/bankFields';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import useRequestState from '@pages/SimplifiedBankOnboarding/requests/useRequestState';

import {useEffect} from 'react';

type NonUSDServerLists = {
    /** The bank inputs could not be read, so the bank step has nothing to show */
    hasBankFieldsReadFailed: boolean;
};

function useNonUSDServerLists({draft, account, workspaces, bankFields}: FlowData, policyID: string | undefined): NonUSDServerLists {
    const achData = account?.achData;
    const currency = getNonUSDCurrency(workspaces, policyID ?? achData?.policyID, achData, draft);
    const {country} = getNonUSDAnswers(draft, account, currency);
    const isBankFieldsLoaded = areBankFieldsLoaded(bankFields, country, currency);
    const bankFieldsRequest = useRequestState(REQUEST_NAMES.GET_BANK_ACCOUNT_FIELDS);

    useNetwork({
        onReconnect: () => {
            if (!country) {
                return;
            }
            getBankAccountFields(country, currency);
        },
    });

    // Every workspace shares the key of the bank inputs, so the inputs in Onyx may belong to another country
    useEffect(() => {
        if (!country || isBankFieldsLoaded) {
            return;
        }
        getBankAccountFields(country, currency);
    }, [country, currency, isBankFieldsLoaded]);

    useEffect(() => {
        if (!country) {
            return;
        }
        getOnboardingFields(country);
    }, [country]);

    return {hasBankFieldsReadFailed: !!bankFieldsRequest.errors && !isBankFieldsLoaded};
}

export default useNonUSDServerLists;
