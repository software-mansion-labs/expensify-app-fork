/**
 * The three yes or no questions of the owner step. Each one decides where the step goes next, and the two that lead to a
 * new owner clear the owner buffer first.
 */
import type {QuestionPageConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import {findOwner} from '@pages/SimplifiedBankOnboarding/model/owners/ownerList';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

import type {Owner, OwnersStepDefinition} from './types';

import getNewOwnerDraftUpdate from './getNewOwnerDraftUpdate';

/**
 * The details of a user who is listed as an owner come before the question about other owners is asked, so the question
 * must not stop the user on the way to those details. Once the user owns too much for another owner to hold 25%, the
 * question has no answer to give.
 */
function isAnyoneElseOwnerSkipped<TOwner extends Owner>({answers, userOwnerID, isUserOwner, canAddMoreOwners}: OwnersStepDefinition<TOwner>): boolean {
    if (!userOwnerID) {
        return false;
    }
    const isAddingUser = answers.ownerBeingModifiedID === userOwnerID && !findOwner(answers.owners, userOwnerID);
    return isAddingUser || (isUserOwner && !canAddMoreOwners(answers.owners));
}

function getIsUserOwnerPage<TOwner extends Owner>({subPages, answers, copy, onUserOwnerAnswer}: OwnersStepDefinition<TOwner>): QuestionPageConfig {
    return {
        kind: 'question',
        id: subPages.isUserOwner,
        isComplete: answers.ownsMoreThan25Percent !== undefined,
        fieldID: INPUT_IDS.OWNS_MORE_THAN_25_PERCENT,
        title: copy.isUserOwnerTitle,
        description: copy.description,
        defaultValue: answers.ownsMoreThan25Percent ?? false,
        onSubmit: onUserOwnerAnswer,
    };
}

function getIsAnyoneElseOwnerPage<TOwner extends Owner>(definition: OwnersStepDefinition<TOwner>): QuestionPageConfig {
    const {subPages, answers, isUserOwner, canAddMoreOwners, detailsPages, copy} = definition;
    return {
        kind: 'question',
        id: subPages.isAnyoneElseOwner,
        isComplete: answers.hasOtherBeneficialOwners !== undefined || isAnyoneElseOwnerSkipped(definition),
        fieldID: INPUT_IDS.HAS_OTHER_BENEFICIAL_OWNERS,
        title: copy.isAnyoneElseOwnerTitle,
        description: copy.description,
        defaultValue: answers.hasOtherBeneficialOwners ?? false,
        onSubmit: (values) => {
            if (!values.hasOtherBeneficialOwners) {
                // Without other owners the list only shows the user, so a user who is no owner either finishes the step here
                return isUserOwner ? {nextPageID: subPages.ownersList} : {};
            }
            if (canAddMoreOwners(answers.owners)) {
                return {draftUpdate: getNewOwnerDraftUpdate(values), nextPageID: detailsPages[0].id};
            }
            return {nextPageID: subPages.ownersList};
        },
    };
}

function getAreThereMoreOwnersPage<TOwner extends Owner>({subPages, answers, canAddMoreOwners, detailsPages, copy}: OwnersStepDefinition<TOwner>): QuestionPageConfig {
    return {
        kind: 'question',
        id: subPages.areThereMoreOwners,
        isComplete: answers.hasMoreBeneficialOwners !== undefined || !canAddMoreOwners(answers.owners),
        fieldID: INPUT_IDS.HAS_MORE_BENEFICIAL_OWNERS,
        title: copy.areThereMoreOwnersTitle,
        description: copy.description,
        defaultValue: false,
        onSubmit: (values) => {
            if (values.hasMoreBeneficialOwners) {
                return {draftUpdate: getNewOwnerDraftUpdate(values), nextPageID: detailsPages[0].id};
            }
            return {nextPageID: subPages.ownersList};
        },
    };
}

export {getAreThereMoreOwnersPage, getIsAnyoneElseOwnerPage, getIsUserOwnerPage};
