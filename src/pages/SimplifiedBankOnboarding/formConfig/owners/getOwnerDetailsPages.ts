/**
 * The pages that edit one owner through the owner buffer and the confirmation that copies the buffer into the owner
 * list. A committed owner keeps its ID, so a later edit replaces it in place.
 */
import type {ConfirmationPageConfig, FormPageConfig, PageID} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import isFormPageComplete from '@pages/SimplifiedBankOnboarding/formConfig/validation/isFormPageComplete';
import {commitOwner, createOwnerID, findOwner} from '@pages/SimplifiedBankOnboarding/model/owners/ownerList';

import type {Owner, OwnersStepDefinition} from './types';

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
        isComplete: answers.owners.length > 0 || isFormPageComplete(page.fields, translate),
        previousPageID: index === 0 ? getFirstDetailsPreviousPageID(definition) : undefined,
    }));
}

/** A new owner who leaves room for another one is followed by the question about more owners, any other owner by the list */
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
                draftUpdate: {...getOwnersDraftUpdate(owners), ownerBeingModifiedID: ownerID},
                nextPageID: !editedOwner && canAddMoreOwners(owners) ? nextQuestionPageID : subPages.ownersList,
            };
        },
    };
}

export {getOwnerConfirmationPage, getOwnerDetailsPages};
