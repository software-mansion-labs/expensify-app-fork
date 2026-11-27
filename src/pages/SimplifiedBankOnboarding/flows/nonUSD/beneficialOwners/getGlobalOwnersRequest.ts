/**
 * Saves the beneficial owners of a global account. Unlike the USD request, the list holds the user as well when the
 * user is an owner.
 */
import type {GlobalOwnerDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/contract/REQUEST_NAMES';
import type {PlannedRequest} from '@pages/SimplifiedBankOnboarding/core';
import {planRequest} from '@pages/SimplifiedBankOnboarding/core';
import getAccountErrorOnyxData from '@pages/SimplifiedBankOnboarding/flows/shared/getAccountErrorOnyxData';
import {getGlobalOwnersParams} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/ownerParams';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {BankAccountParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';

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
