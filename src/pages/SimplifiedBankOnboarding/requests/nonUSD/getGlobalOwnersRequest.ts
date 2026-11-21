/**
 * Saves the beneficial owners of a global account. Unlike the USD request, the list holds the user as well when the
 * user is an owner.
 */
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {getGlobalOwnersParams} from '@pages/SimplifiedBankOnboarding/model/owners/ownerParams';
import getAccountErrorOnyxData from '@pages/SimplifiedBankOnboarding/requests/getAccountErrorOnyxData';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import {planRequest} from '@pages/SimplifiedBankOnboarding/requests/runRequest';
import type {PlannedRequest} from '@pages/SimplifiedBankOnboarding/requests/types';
import type {GlobalOwnerDraft} from '@pages/SimplifiedBankOnboarding/types/form';

type GlobalOwnersAnswers = {
    ownsMoreThan25Percent: boolean;

    /** Every owner, the current user included */
    owners: GlobalOwnerDraft[];
};

function getGlobalOwnersRequest(bankAccount: BankAccountParams, {ownsMoreThan25Percent, owners}: GlobalOwnersAnswers): PlannedRequest {
    return planRequest({
        name: REQUEST_NAMES.SAVE_GLOBAL_OWNERS,
        scope: bankAccount,
        type: 'write',
        command: WRITE_COMMANDS.SAVE_ONBOARDING_BENEFICIAL_OWNERS,
        params: {...bankAccount, ownsMoreThan25Percent, ...getGlobalOwnersParams(owners)},
        onyxData: getAccountErrorOnyxData('common.genericErrorMessage'),
    });
}

export default getGlobalOwnersRequest;
export type {GlobalOwnersAnswers};
