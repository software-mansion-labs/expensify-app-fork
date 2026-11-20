/**
 * The reads that describe the NonUSD forms: the bank inputs of a country and the picklists of the business step.
 */
import {READ_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import runRequest from '@pages/SimplifiedBankOnboarding/requests/runRequest';
import type {RequestOutcome} from '@pages/SimplifiedBankOnboarding/requests/types';

function getBankAccountFields(countryISO: string, currency: string): Promise<RequestOutcome> {
    return runRequest({name: REQUEST_NAMES.GET_BANK_ACCOUNT_FIELDS, type: 'read', command: READ_COMMANDS.GET_BANK_ACCOUNT_FIELDS, params: {countryISO, currency}});
}

function getOnboardingFields(countryISO: string): Promise<RequestOutcome> {
    return runRequest({name: REQUEST_NAMES.GET_ONBOARDING_FIELDS, type: 'read', command: READ_COMMANDS.GET_ONBOARDING_FIELDS, params: {countryISO}});
}

export {getBankAccountFields, getOnboardingFields};
