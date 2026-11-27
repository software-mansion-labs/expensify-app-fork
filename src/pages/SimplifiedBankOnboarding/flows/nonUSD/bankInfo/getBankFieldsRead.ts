import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/contract/REQUEST_NAMES';
import type {PlannedRead} from '@pages/SimplifiedBankOnboarding/core';
import {planRead} from '@pages/SimplifiedBankOnboarding/core';
import {READ_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

/** The server describes the bank inputs of a country and a currency, and the bank step has no pages without them */
function getBankFieldsRead(countryISO: string, currency: string, isLoaded: boolean): PlannedRead {
    return planRead({name: REQUEST_NAMES.GET_BANK_ACCOUNT_FIELDS, type: 'read', command: READ_COMMANDS.GET_BANK_ACCOUNT_FIELDS, params: {countryISO, currency}}, isLoaded);
}

export default getBankFieldsRead;
