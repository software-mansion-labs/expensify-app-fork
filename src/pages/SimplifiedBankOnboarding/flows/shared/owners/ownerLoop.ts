/**
 * The owner loop of one kind, kept in the draft of the main form: a list (`usdOwners` or `globalOwners`) and a buffer of
 * the owner being edited (`ownerBeingModifiedID` and the `owner*` inputs). The step reads its list from its answers and
 * gives it with the draft of its flow data, so the rule "owners saved on the server are the list until the draft has its
 * own list" stays in the answers of each flow.
 *
 * The update builders return a draft update and save nothing, so the blocks (YesNoSubPage, ConfirmationSubPage) save
 * them in their one submit path, before the request and before moving on. The loop never navigates.
 */
import type {GlobalOwnerDraft, OnboardingDraft, USDOwnerDraft} from '@pages/SimplifiedBankOnboarding/contract/form';

import type {OwnerBuffer, OwnerBufferMapping} from './ownerBuffer';
import type {Owner} from './ownerList';

import {EMPTY_OWNER_BUFFER, GLOBAL_OWNER_BUFFER, readOwnerBuffer, USD_OWNER_BUFFER} from './ownerBuffer';
import {canAddMoreGlobalOwners, canAddMoreUSDOwners, MAX_GLOBAL_OWNERS_NEXT_TO_USER, MAX_USD_OWNERS_NEXT_TO_USER} from './ownerLimits';
import {commitOwner, createOwnerID, CURRENT_USER_OWNER_ID, findOwner, removeOwner} from './ownerList';

type OwnerLoop<TOwner extends Owner> = {
    owners: TOwner[];

    /** The list after the buffer is committed. The owner confirmation decides its `next` from it in render. */
    ownersAfterCommit: TOwner[];

    /** Undefined until a question or the list started an owner. The details pages show a loader until then. */
    ownerBeingModifiedID: string | undefined;

    /** The values of the owner being edited, the defaults of the details pages */
    buffer: OwnerBuffer;

    /** True when the buffer holds an owner that the list already has: after a row press, or after the owner was committed */
    isEditingListedOwner: boolean;
    canAddMore: boolean;

    /** An empty buffer with a new ID */
    getStartUpdate: () => OnboardingDraft;

    /**
     * The NonUSD "I own 25%": room for the user, and the user in the buffer. The user leaves the list until the
     * confirmation commits the user again, so the details pages tell this start apart from a press on the user's row.
     */
    getStartUserUpdate: () => OnboardingDraft;

    /** The buffer filled with a listed owner */
    getEditUpdate: (id: string) => OnboardingDraft;

    /**
     * The list with the buffer added or replaced by ID. The buffer stays, so the confirmation keeps its content until the
     * next page opens, and the committed owner counts as a listed one from then on. Every start or edit replaces it.
     */
    getCommitUpdate: () => OnboardingDraft;
    getRemoveUpdate: (id: string) => OnboardingDraft;

    /** The list without the last owners that no longer fit once the user owns 25% */
    getMakeRoomForUserUpdate: () => OnboardingDraft;

    /** The list with the user only, or an empty list when the user is not listed */
    getRemoveOtherOwnersUpdate: () => OnboardingDraft;
};

type OwnerLoopRules<TOwner extends Owner> = {
    owners: TOwner[];
    canAddMore: boolean;

    /** USD keeps the limit when an owner is committed. NonUSD checks it only when an owner starts, as the old step did. */
    canCommitNewOwner: boolean;
    maxOwnersNextToUser: number;
    mapping: OwnerBufferMapping<TOwner>;
};

function getOwnerLoop<TOwner extends Owner>({owners, canAddMore, canCommitNewOwner, maxOwnersNextToUser, mapping}: OwnerLoopRules<TOwner>, draft: OnboardingDraft): OwnerLoop<TOwner> {
    const ownerBeingModifiedID = draft.ownerBeingModifiedID ?? undefined;
    const buffer = readOwnerBuffer(draft);

    const isEditingListedOwner = !!findOwner(owners, ownerBeingModifiedID);
    const committedOwner = ownerBeingModifiedID ? mapping.getOwner(ownerBeingModifiedID, buffer) : undefined;
    const ownersAfterCommit = committedOwner && (isEditingListedOwner || canCommitNewOwner) ? commitOwner(owners, committedOwner) : owners;

    function getOwnersWithRoomForUser(): TOwner[] {
        const otherOwners = owners.filter((owner) => owner.id !== CURRENT_USER_OWNER_ID);
        const droppedOwnerIDs = new Set(otherOwners.slice(maxOwnersNextToUser).map((owner) => owner.id));
        return owners.filter((owner) => !droppedOwnerIDs.has(owner.id));
    }

    function getStartUserUpdate(): OnboardingDraft {
        const listedUser = findOwner(owners, CURRENT_USER_OWNER_ID);

        // The user who went back from the details pages and answers again keeps what they typed
        const userBuffer = !listedUser && ownerBeingModifiedID === CURRENT_USER_OWNER_ID ? buffer : mapping.getBuffer(listedUser);

        return {
            ...mapping.getListUpdate(removeOwner(getOwnersWithRoomForUser(), CURRENT_USER_OWNER_ID)),
            ownerBeingModifiedID: CURRENT_USER_OWNER_ID,
            ...userBuffer,
        };
    }

    return {
        owners,
        ownersAfterCommit,
        ownerBeingModifiedID,
        buffer,
        isEditingListedOwner,
        canAddMore,
        getStartUpdate: () => ({
            ownerBeingModifiedID: createOwnerID(),
            ...EMPTY_OWNER_BUFFER,
        }),
        getStartUserUpdate,
        getEditUpdate: (id) => ({
            ownerBeingModifiedID: id,
            ...mapping.getBuffer(findOwner(owners, id)),
        }),
        getCommitUpdate: () => mapping.getListUpdate(ownersAfterCommit),
        getRemoveUpdate: (id) => mapping.getListUpdate(removeOwner(owners, id)),
        getMakeRoomForUserUpdate: () => mapping.getListUpdate(getOwnersWithRoomForUser()),
        getRemoveOtherOwnersUpdate: () => mapping.getListUpdate(owners.filter((owner) => owner.id === CURRENT_USER_OWNER_ID)),
    };
}

/** The USD list holds the owners other than the user, who is listed by the personal info step */
function getUSDOwnerLoopRules(owners: USDOwnerDraft[], isUserOwner: boolean): OwnerLoopRules<USDOwnerDraft> {
    const canAddMore = canAddMoreUSDOwners(owners, isUserOwner);
    return {
        owners,
        canAddMore,
        canCommitNewOwner: canAddMore,
        maxOwnersNextToUser: MAX_USD_OWNERS_NEXT_TO_USER,
        mapping: USD_OWNER_BUFFER,
    };
}

function getGlobalOwnerLoopRules(owners: GlobalOwnerDraft[]): OwnerLoopRules<GlobalOwnerDraft> {
    return {
        owners,
        canAddMore: canAddMoreGlobalOwners(owners),
        canCommitNewOwner: true,
        maxOwnersNextToUser: MAX_GLOBAL_OWNERS_NEXT_TO_USER,
        mapping: GLOBAL_OWNER_BUFFER,
    };
}

export default getOwnerLoop;
export {getGlobalOwnerLoopRules, getUSDOwnerLoopRules};
export type {OwnerLoop};
