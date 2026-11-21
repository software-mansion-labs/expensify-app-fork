/**
 * Saves the beneficial owners of a USD account. The list holds only the other owners, and a separate flag says whether
 * the user is an owner too.
 */
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {getUSDOwnersParams} from '@pages/SimplifiedBankOnboarding/model/owners/ownerParams';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import {planRequest} from '@pages/SimplifiedBankOnboarding/requests/runRequest';
import type {PlannedRequest} from '@pages/SimplifiedBankOnboarding/requests/types';
import type {USDOwnerDraft} from '@pages/SimplifiedBankOnboarding/types/form';

import getUSDOnyxData, {USD_ERROR_KEY} from './getUSDOnyxData';

type USDOwnersAnswers = {
    ownsMoreThan25Percent: boolean;

    /** The other owners, the user is not in this list */
    owners: USDOwnerDraft[];
};

function getOwnersRequest(bankAccount: BankAccountParams, {ownsMoreThan25Percent, owners}: USDOwnersAnswers): PlannedRequest {
    return planRequest({
        name: REQUEST_NAMES.SAVE_OWNERS,
        scope: bankAccount,
        type: 'write',
        command: WRITE_COMMANDS.UPDATE_BENEFICIAL_OWNERS,
        params: {...bankAccount, ownsMoreThan25Percent, ...getUSDOwnersParams(owners)},
        onyxData: getUSDOnyxData(),
        errorKey: USD_ERROR_KEY,
    });
}

export default getOwnersRequest;
export type {USDOwnersAnswers};
