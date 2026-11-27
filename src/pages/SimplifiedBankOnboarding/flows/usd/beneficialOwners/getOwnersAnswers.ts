/**
 * The answers of the USD owners step: the draft value, then the saved one (BC-08). The owners that the server saved
 * are used while the draft has no list of its own, which is the case after the user left the flow and came back.
 */
import type {USDOwnerDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {FlowData} from '@pages/SimplifiedBankOnboarding/core';
import {getUSDOwnersFromServer} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/serverOwners';

type OwnersAnswers = {
    /** Undefined until the user answered the question or the server saved the owners step */
    ownsMoreThan25Percent: boolean | undefined;

    /** Undefined until the user answered the question or the server saved the owners step */
    hasOtherBeneficialOwners: boolean | undefined;

    /** The owners other than the user */
    owners: USDOwnerDraft[];

    /** True once the server saved the owners step */
    hasSavedOwners: boolean;
};

function getOwnersAnswers({draft, account}: FlowData): OwnersAnswers {
    const achData = account?.achData;
    const hasSavedOwners = achData?.ownsMoreThan25Percent !== undefined;

    return {
        ownsMoreThan25Percent: draft.ownsMoreThan25Percent ?? achData?.ownsMoreThan25Percent,

        // The server has no answer of its own for this question: the saved owners step answered yes when it saved owners
        hasOtherBeneficialOwners: draft.hasOtherBeneficialOwners ?? (hasSavedOwners ? (achData?.beneficialOwners?.length ?? 0) > 0 : undefined),
        owners: draft.usdOwners ?? getUSDOwnersFromServer(achData),
        hasSavedOwners,
    };
}

export default getOwnersAnswers;
