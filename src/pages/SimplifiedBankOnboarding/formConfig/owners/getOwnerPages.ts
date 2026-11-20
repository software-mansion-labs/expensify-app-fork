/**
 * The pages of an owner step, shared by both flows: the three yes or no questions, the pages that edit one owner through
 * the owner buffer, the confirmation that copies the buffer into the owner list and the list of owners. Each flow only
 * supplies its owner details pages, its copy and the rules where the flows differ.
 */
import type {ConfirmationPageConfig, FormPageConfig, ListPageConfig, PageConfig, PageID, QuestionPageConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import areInputsComplete from '@pages/SimplifiedBankOnboarding/formConfig/validation/areInputsComplete';
import {EMPTY_OWNER_BUFFER} from '@pages/SimplifiedBankOnboarding/model/owners/ownerBuffer';
import {commitOwner, createOwnerID, findOwner} from '@pages/SimplifiedBankOnboarding/model/owners/ownerList';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/types/form';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

import type {Owner, OwnersStepDefinition} from './types';

/** The answer of a question that leads to a new owner, with an empty buffer so the owner pages start blank */
function getNewOwnerDraftUpdate(answer: OnboardingDraft): OnboardingDraft {
    return {...answer, ...EMPTY_OWNER_BUFFER, ownerBeingModifiedID: null};
}

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
                return {
                    draftUpdate: getNewOwnerDraftUpdate(values),
                    nextPageID: detailsPages[0].id,
                };
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
                return {
                    draftUpdate: getNewOwnerDraftUpdate(values),
                    nextPageID: detailsPages[0].id,
                };
            }
            return {nextPageID: subPages.ownersList};
        },
    };
}

/** An owner of the list goes back to the list, the user to the question about the user and a new owner to the question that started it */
function getFirstDetailsPreviousPageID<TOwner extends Owner>({subPages, answers, userOwnerID}: OwnersStepDefinition<TOwner>): PageID {
    if (findOwner(answers.owners, answers.ownerBeingModifiedID)) {
        return subPages.ownersList;
    }
    if (userOwnerID && answers.ownerBeingModifiedID === userOwnerID) {
        return subPages.isUserOwner;
    }
    const hasListedOtherOwners = answers.owners.some((owner) => owner.id !== userOwnerID);
    return hasListedOtherOwners ? subPages.areThereMoreOwners : subPages.isAnyoneElseOwner;
}

function getOwnerDetailsPages<TOwner extends Owner>(definition: OwnersStepDefinition<TOwner>): FormPageConfig[] {
    const {answers, detailsPages, translate} = definition;
    return detailsPages.map((page, index) => ({
        ...page,
        isComplete: answers.owners.length > 0 || areInputsComplete(page.inputs, answers, translate),
        previousPageID: index === 0 ? getFirstDetailsPreviousPageID(definition) : undefined,
    }));
}

/**
 * A committed owner keeps its ID, so a later edit replaces it in place. A new owner who leaves room for another one is
 * followed by the question about more owners, any other owner by the list.
 */
function getOwnerConfirmationPage<TOwner extends Owner>(definition: OwnersStepDefinition<TOwner>): ConfirmationPageConfig {
    const {subPages, answers, userOwnerID, canAddMoreOwners, confirmationTitle, confirmationRows, getOwnerFromBuffer, getOwnersDraftUpdate} = definition;
    return {
        kind: 'confirmation',
        id: subPages.confirmation,
        isComplete: answers.owners.length > 0,
        title: confirmationTitle,
        rows: confirmationRows,
        onSubmit: () => {
            const editedOwner = findOwner(answers.owners, answers.ownerBeingModifiedID);
            const ownerID = editedOwner?.id ?? answers.ownerBeingModifiedID ?? createOwnerID();
            const owners = commitOwner(answers.owners, getOwnerFromBuffer(ownerID, answers));
            const nextQuestionPageID = ownerID === userOwnerID ? subPages.isAnyoneElseOwner : subPages.areThereMoreOwners;
            return {
                draftUpdate: {
                    ...getOwnersDraftUpdate(owners),
                    ownerBeingModifiedID: ownerID,
                },
                nextPageID: !editedOwner && canAddMoreOwners(owners) ? nextQuestionPageID : subPages.ownersList,
            };
        },
    };
}

/**
 * The owners that the step sends. A row opens the owner in the owner pages, not in edit mode, because Back from the
 * first details page must return to this list.
 */
function getOwnersListPage<TOwner extends Owner>({
    subPages,
    answers,
    hasOtherOwners,
    canAddMoreOwners,
    detailsPages,
    listRows,
    getOwnerBuffer,
    translate,
}: OwnersStepDefinition<TOwner>): ListPageConfig {
    return {
        kind: 'list',
        id: subPages.ownersList,
        isComplete: true,
        title: translate('beneficialOwnerInfoStep.letsDoubleCheck'),
        description: translate('beneficialOwnerInfoStep.regulationRequiresUsToVerifyTheIdentity'),
        rowsTitle: `${translate('beneficialOwnerInfoStep.owners')}:`,
        rows: listRows,
        previousPageID: hasOtherOwners && canAddMoreOwners(answers.owners) ? subPages.areThereMoreOwners : subPages.isAnyoneElseOwner,
        onRowPress: (rowID) => ({
            draftUpdate: {
                ...getOwnerBuffer(findOwner(answers.owners, rowID)),
                ownerBeingModifiedID: rowID,
            },
            nextPageID: detailsPages[0].id,
        }),
    };
}

/**
 * The pages follow the answers: the owner pages exist only when the flow shows them, the question about more owners
 * only once someone else owns 25% and the list only when it has someone to show. A user who owns less than 25% and
 * answers that nobody else does finishes the step on the second question.
 */
function getOwnerPages<TOwner extends Owner>(definition: OwnersStepDefinition<TOwner>): PageConfig[] {
    const {isUserOwner, hasOtherOwners, shouldShowOwnerPages} = definition;
    const ownerPages = shouldShowOwnerPages ? [...getOwnerDetailsPages(definition), getOwnerConfirmationPage(definition)] : [];
    const moreOwnersPages = hasOtherOwners ? [getAreThereMoreOwnersPage(definition)] : [];
    const listPages = isUserOwner || hasOtherOwners ? [getOwnersListPage(definition)] : [];
    return [getIsUserOwnerPage(definition), getIsAnyoneElseOwnerPage(definition), ...ownerPages, ...moreOwnersPages, ...listPages];
}

export default getOwnerPages;
