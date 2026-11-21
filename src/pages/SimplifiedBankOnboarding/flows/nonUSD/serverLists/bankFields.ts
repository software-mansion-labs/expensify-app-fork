/**
 * The reads that describe the NonUSD forms: the bank inputs of a country and the picklists of the business step.
 */
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/contract/REQUEST_NAMES';
import type {RequestOutcome} from '@pages/SimplifiedBankOnboarding/core';
import {runRequest} from '@pages/SimplifiedBankOnboarding/core';
import {READ_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

function getBankAccountFields(countryISO: string, currency: string): Promise<RequestOutcome> {
    return runRequest({name: REQUEST_NAMES.GET_BANK_ACCOUNT_FIELDS, type: 'read', command: READ_COMMANDS.GET_BANK_ACCOUNT_FIELDS, params: {countryISO, currency}});
}

function getOnboardingFields(countryISO: string): Promise<RequestOutcome> {
    return runRequest({name: REQUEST_NAMES.GET_ONBOARDING_FIELDS, type: 'read', command: READ_COMMANDS.GET_ONBOARDING_FIELDS, params: {countryISO}});
}

export {getBankAccountFields, getOnboardingFields};
