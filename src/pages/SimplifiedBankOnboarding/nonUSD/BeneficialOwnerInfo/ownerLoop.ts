/**
 * The transitions of the NonUSD owner loop, the same rules as the handlers of the real `BeneficialOwnerInfo`. More owners
 * fit only while their shares leave room for another owner of 25%, and the user who owns a share fills in the same
 * details form under a fixed owner ID.
 */
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {OnboardingForm} from '@pages/SimplifiedBankOnboarding/types/form';
import type {OwnerLoopTransition} from '@pages/SimplifiedBankOnboarding/utils/owners/types';

import type {ValueOf} from 'type-fest';

const {BENEFICIAL_OWNER_INFO_SUB_PAGES: SUB_PAGE_NAMES, MAX_OWNERSHIP_SUM_TO_ADD_MORE, CURRENT_USER_KEY} = SBO_CONST.NON_USD;

/** An owner holds at least 25%, so only three others fit next to the user */
const MAX_OWNERS_NEXT_TO_USER = 3;

type OwnerSubPage = ValueOf<typeof SUB_PAGE_NAMES>;

type OwnerQuestion = typeof SUB_PAGE_NAMES.IS_USER_BENEFICIAL_OWNER | typeof SUB_PAGE_NAMES.IS_ANYONE_ELSE_BENEFICIAL_OWNER | typeof SUB_PAGE_NAMES.ARE_THERE_MORE_BENEFICIAL_OWNERS;

type OwnerLoopState = {
    ownerKeys: string[];
    isUserOwner: boolean;
    ownerBeingModifiedID: string | undefined;
    isEditingCreatedOwner: boolean;

    /** The share of every owner in the list and of the owner being modified, by owner ID */
    ownedPercentages: Record<string, number>;
};

function canAddMoreOwners(ownerIDs: string[], ownedPercentages: Record<string, number>): boolean {
    const ownedPercentageSum = ownerIDs.reduce((sum, ownerID) => sum + (ownedPercentages[ownerID] ?? 0), 0);
    return ownedPercentageSum <= MAX_OWNERSHIP_SUM_TO_ADD_MORE;
}

function openOwnerForm(draftValues: Partial<OnboardingForm>, ownerID: string): OwnerLoopTransition<OwnerSubPage> {
    return {draftValues: {...draftValues, ownerBeingModifiedID: ownerID}, next: {subPage: SUB_PAGE_NAMES.NAME}};
}

function getNextOwnerSubPage(question: OwnerQuestion, answer: boolean, state: OwnerLoopState, newOwnerID: string): OwnerLoopTransition<OwnerSubPage> {
    const {ownerKeys, isUserOwner, ownedPercentages} = state;
    switch (question) {
        case SUB_PAGE_NAMES.IS_USER_BENEFICIAL_OWNER: {
            if (answer) {
                const isListFull = ownerKeys.length > MAX_OWNERS_NEXT_TO_USER;
                return openOwnerForm({ownsMoreThan25Percent: true, ...(isListFull ? {beneficialOwnerKeys: ownerKeys.slice(0, MAX_OWNERS_NEXT_TO_USER)} : {})}, CURRENT_USER_KEY);
            }
            return {
                draftValues: {ownsMoreThan25Percent: false, beneficialOwnerKeys: ownerKeys.filter((ownerID) => ownerID !== CURRENT_USER_KEY)},
                next: {subPage: SUB_PAGE_NAMES.IS_ANYONE_ELSE_BENEFICIAL_OWNER},
            };
        }
        case SUB_PAGE_NAMES.IS_ANYONE_ELSE_BENEFICIAL_OWNER: {
            const draftValues = {anyIndividualOwn25PercentOrMore: answer};
            if (!answer && !isUserOwner) {
                return {draftValues: {...draftValues, beneficialOwnerKeys: []}, next: {submitOwnerKeys: []}};
            }
            if (!answer) {
                return {draftValues: {...draftValues, beneficialOwnerKeys: [CURRENT_USER_KEY]}, next: {subPage: SUB_PAGE_NAMES.BENEFICIAL_OWNERS_LIST}};
            }
            if (!canAddMoreOwners(ownerKeys, ownedPercentages)) {
                return {draftValues, next: {subPage: SUB_PAGE_NAMES.BENEFICIAL_OWNERS_LIST}};
            }
            return openOwnerForm(draftValues, newOwnerID);
        }
        default: {
            if (!answer || !canAddMoreOwners(ownerKeys, ownedPercentages)) {
                return {draftValues: {}, next: {subPage: SUB_PAGE_NAMES.BENEFICIAL_OWNERS_LIST}};
            }
            return openOwnerForm({anyIndividualOwn25PercentOrMore: true}, newOwnerID);
        }
    }
}

/** The owner joins the list, and the list opens once the user edited an owner or the shares leave no room for another */
function getSubPageAfterOwnerDetails(state: OwnerLoopState): OwnerLoopTransition<OwnerSubPage> {
    const ownerID = state.ownerBeingModifiedID ?? CURRENT_USER_KEY;
    const isNewOwner = !state.ownerKeys.includes(ownerID);
    const updatedOwnerKeys = isNewOwner ? [...state.ownerKeys, ownerID] : state.ownerKeys;
    const draftValues: Partial<OnboardingForm> = isNewOwner ? {beneficialOwnerKeys: updatedOwnerKeys} : {};

    if (state.isEditingCreatedOwner || !canAddMoreOwners(updatedOwnerKeys, state.ownedPercentages)) {
        return {draftValues: {...draftValues, isEditingCreatedOwner: false}, next: {subPage: SUB_PAGE_NAMES.BENEFICIAL_OWNERS_LIST}};
    }

    // The user just entered their own data, so the question about the other owners comes next.
    const subPage = ownerID === CURRENT_USER_KEY ? SUB_PAGE_NAMES.IS_ANYONE_ELSE_BENEFICIAL_OWNER : SUB_PAGE_NAMES.ARE_THERE_MORE_BENEFICIAL_OWNERS;
    return {draftValues, next: {subPage}};
}

export {canAddMoreOwners, getNextOwnerSubPage, getSubPageAfterOwnerDetails};
export type {OwnerLoopState, OwnerQuestion, OwnerSubPage};
