import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/contract/REQUEST_NAMES';
import type {PlannedRead} from '@pages/SimplifiedBankOnboarding/core';
import {planRead} from '@pages/SimplifiedBankOnboarding/core';
import {READ_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

/** The server lists the business types of a country. The stored lists name no country, so they may belong to another one. */
function getPicklistsRead(countryISO: string, isLoaded: boolean): PlannedRead {
    return planRead({name: REQUEST_NAMES.GET_ONBOARDING_FIELDS, type: 'read', command: READ_COMMANDS.GET_ONBOARDING_FIELDS, params: {countryISO}}, isLoaded);
}

export default getPicklistsRead;
