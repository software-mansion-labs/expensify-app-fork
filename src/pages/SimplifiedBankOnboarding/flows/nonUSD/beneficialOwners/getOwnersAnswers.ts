/**
 * The answers of the NonUSD owners step: the draft value, then the one that the global provider saved (BC-08). The
 * saved owners are used while the draft has no list of its own, which is the case after the user left and came back.
 */
import type {GlobalOwnerDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {FlowData} from '@pages/SimplifiedBankOnboarding/core';
import {getGlobalOwnersFromServer} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/serverOwners';

type OwnersAnswers = {
    /** Undefined until the user answered the question or the server saved the owners step */
    ownsMoreThan25Percent: boolean | undefined;

    /** Undefined until the user answered the question or the server saved the owners step */
    anyIndividualOwn25PercentOrMore: boolean | undefined;

    /** Every owner, the user included under `CURRENT_USER_OWNER_ID` */
    owners: GlobalOwnerDraft[];
};

function getOwnersAnswers({draft, account}: FlowData): OwnersAnswers {
    const corpay = account?.achData?.corpay;

    return {
        ownsMoreThan25Percent: draft.ownsMoreThan25Percent ?? corpay?.ownsMoreThan25Percent,
        anyIndividualOwn25PercentOrMore: draft.anyIndividualOwn25PercentOrMore ?? corpay?.anyIndividualOwn25PercentOrMore,
        owners: draft.globalOwners ?? getGlobalOwnersFromServer(corpay),
    };
}

export default getOwnersAnswers;
