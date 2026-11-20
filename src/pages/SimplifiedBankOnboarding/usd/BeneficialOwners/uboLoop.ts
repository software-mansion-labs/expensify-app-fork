/**
 * The transitions of the USD owner loop, the same rules as the handlers of the real `BeneficialOwnersStep`. The user
 * takes one of the places when they own a share, so the loop fits one owner less in that case.
 */
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {OwnerLoopTransition} from '@pages/SimplifiedBankOnboarding/utils/owners/types';

import type {ValueOf} from 'type-fest';

const {BENEFICIAL_OWNERS_SUB_PAGES: SUB_PAGE_NAMES, MAX_NUMBER_OF_UBOS} = SBO_CONST.USD;

type UBOSubPage = ValueOf<typeof SUB_PAGE_NAMES>;

type UBOQuestion = typeof SUB_PAGE_NAMES.IS_USER_UBO | typeof SUB_PAGE_NAMES.IS_ANYONE_ELSE_UBO | typeof SUB_PAGE_NAMES.ARE_THERE_MORE_UBOS;

type UBOLoopState = {
    ownerKeys: string[];
    isUserUBO: boolean;
    ownerBeingModifiedID: string | undefined;
    isEditingCreatedOwner: boolean;
};

function canAddMoreUBOs(ownerKeys: string[], isUserUBO: boolean): boolean {
    return ownerKeys.length < (isUserUBO ? MAX_NUMBER_OF_UBOS - 1 : MAX_NUMBER_OF_UBOS);
}

function openNewOwnerForm(draftValues: OwnerLoopTransition<UBOSubPage>['draftValues'], newOwnerID: string): OwnerLoopTransition<UBOSubPage> {
    return {draftValues: {...draftValues, ownerBeingModifiedID: newOwnerID}, next: {subPage: SUB_PAGE_NAMES.LEGAL_NAME}};
}

function getNextUBOSubPage(question: UBOQuestion, answer: boolean, state: UBOLoopState, newOwnerID: string): OwnerLoopTransition<UBOSubPage> {
    switch (question) {
        case SUB_PAGE_NAMES.IS_USER_UBO: {
            // The user takes one of the places, so the last owner who no longer fits is dropped.
            const isListFull = answer && state.ownerKeys.length === MAX_NUMBER_OF_UBOS;
            return {
                draftValues: {ownsMoreThan25Percent: answer, ...(isListFull ? {beneficialOwnerKeys: state.ownerKeys.slice(0, MAX_NUMBER_OF_UBOS - 1)} : {})},
                next: {subPage: SUB_PAGE_NAMES.IS_ANYONE_ELSE_UBO},
            };
        }
        case SUB_PAGE_NAMES.IS_ANYONE_ELSE_UBO: {
            const draftValues = {hasOtherBeneficialOwners: answer};
            if (answer && canAddMoreUBOs(state.ownerKeys, state.isUserUBO)) {
                return openNewOwnerForm(draftValues, newOwnerID);
            }
            if (!answer && !state.isUserUBO) {
                return {draftValues, next: {submitOwnerKeys: []}};
            }
            return {draftValues, next: {subPage: SUB_PAGE_NAMES.UBOS_LIST}};
        }
        default:
            return answer ? openNewOwnerForm({}, newOwnerID) : {draftValues: {}, next: {subPage: SUB_PAGE_NAMES.UBOS_LIST}};
    }
}

/** A new owner joins the list when it still fits, and the list opens once the user edited an owner or the list is full */
function getSubPageAfterUBODetails(state: UBOLoopState): OwnerLoopTransition<UBOSubPage> {
    const {ownerKeys, isUserUBO, ownerBeingModifiedID, isEditingCreatedOwner} = state;
    const isNewOwner = !!ownerBeingModifiedID && !ownerKeys.includes(ownerBeingModifiedID);
    const shouldAddOwner = isNewOwner && canAddMoreUBOs(ownerKeys, isUserUBO);

    // The keys are counted before the new owner is added, so this owner took the last free place.
    const isLastUBOThatCanBeAdded = ownerKeys.length === (isUserUBO ? MAX_NUMBER_OF_UBOS - 2 : MAX_NUMBER_OF_UBOS - 1);
    return {
        draftValues: {isEditingCreatedOwner: false, ...(shouldAddOwner && ownerBeingModifiedID ? {beneficialOwnerKeys: [...ownerKeys, ownerBeingModifiedID]} : {})},
        next: {subPage: isEditingCreatedOwner || isLastUBOThatCanBeAdded ? SUB_PAGE_NAMES.UBOS_LIST : SUB_PAGE_NAMES.ARE_THERE_MORE_UBOS},
    };
}

export {canAddMoreUBOs, getNextUBOSubPage, getSubPageAfterUBODetails};
export type {UBOLoopState, UBOQuestion, UBOSubPage};
