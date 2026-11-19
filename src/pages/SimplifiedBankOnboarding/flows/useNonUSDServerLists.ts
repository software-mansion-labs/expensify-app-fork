/**
 * Reads the server lists that describe the NonUSD forms: the bank inputs of the chosen country and currency, and the
 * picklists of the business step. The plan shows a loader until they arrive, so the reads run from the screen.
 */
import useNetwork from '@hooks/useNetwork';

import areBankFieldsLoaded from '@pages/SimplifiedBankOnboarding/model/bankFields/areBankFieldsLoaded';
import arePicklistsLoaded from '@pages/SimplifiedBankOnboarding/model/bankFields/arePicklistsLoaded';
import getNonUSDFlowState from '@pages/SimplifiedBankOnboarding/model/getNonUSDFlowState';
import type FlowData from '@pages/SimplifiedBankOnboarding/model/types';
import {getBankAccountFields, getOnboardingFields} from '@pages/SimplifiedBankOnboarding/requests/nonUSD/bankFields';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import useRequestState from '@pages/SimplifiedBankOnboarding/requests/useRequestState';

import {useEffect} from 'react';

type NonUSDServerLists = {
    /** The bank inputs could not be read, so the bank step has nothing to show */
    hasBankFieldsReadFailed: boolean;
};

function useNonUSDServerLists(data: FlowData, policyID: string | undefined): NonUSDServerLists {
    const {
        currency,
        answers: {country},
    } = getNonUSDFlowState(data, policyID);
    const isBankFieldsLoaded = areBankFieldsLoaded(data.bankFields, country, currency);
    const isPicklistsLoaded = arePicklistsLoaded(data.picklists);
    const bankFieldsRequest = useRequestState(REQUEST_NAMES.GET_BANK_ACCOUNT_FIELDS);

    // A read made offline is not sent, so each list that is still missing is read again with the connection
    useNetwork({
        onReconnect: () => {
            if (!country) {
                return;
            }
            if (!isBankFieldsLoaded) {
                getBankAccountFields(country, currency);
            }
            if (!isPicklistsLoaded) {
                getOnboardingFields(country);
            }
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
