/**
 * The pages that edit one owner through the owner buffer: the legal name, the date of birth and the confirmation that
 * copies the buffer into the owner list. A committed owner keeps its ID, so a later edit replaces it in place.
 */
import getDateOfBirthField from '@pages/SimplifiedBankOnboarding/formConfig/fields/getDateOfBirthField';
import getLegalNameFields from '@pages/SimplifiedBankOnboarding/formConfig/fields/getLegalNameFields';
import type {ConfirmationPageConfig, FormPageConfig, PageID} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import isFormPageComplete from '@pages/SimplifiedBankOnboarding/formConfig/validation/isFormPageComplete';
import {canAddMoreUSDOwners} from '@pages/SimplifiedBankOnboarding/model/owners/canAddMoreOwners';
import {getUSDOwnerFromBuffer} from '@pages/SimplifiedBankOnboarding/model/owners/ownerBuffer';
import {commitOwner, createOwnerID, findOwner} from '@pages/SimplifiedBankOnboarding/model/owners/ownerList';
import {getOwnerFullName} from '@pages/SimplifiedBankOnboarding/model/owners/ownerNames';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

import type OwnersStepInput from './types';

const SUB_PAGES = SBO_CONST.USD.BENEFICIAL_OWNERS_SUB_PAGES;

/** An owner of the list goes back to the list, a new owner to the question that started it */
function getLegalNamePreviousPageID({answers}: OwnersStepInput): PageID {
    if (findOwner(answers.owners, answers.ownerBeingModifiedID)) {
        return SUB_PAGES.UBOS_LIST;
    }
    return answers.owners.length > 0 ? SUB_PAGES.ARE_THERE_MORE_UBOS : SUB_PAGES.IS_ANYONE_ELSE_UBO;
}

function getOwnerLegalNamePage(input: OwnersStepInput): FormPageConfig {
    const {answers, translate} = input;
    const fields = getLegalNameFields(
        {firstName: INPUT_IDS.OWNER_FIRST_NAME, lastName: INPUT_IDS.OWNER_LAST_NAME},
        {firstName: answers.ownerFirstName, lastName: answers.ownerLastName},
        translate,
    );
    return {
        kind: 'form',
        id: SUB_PAGES.LEGAL_NAME,
        isComplete: answers.owners.length > 0 || isFormPageComplete(fields, translate),
        title: translate('beneficialOwnerInfoStep.enterLegalFirstAndLastName'),
        description: translate('beneficialOwnerInfoStep.legalNameSubtitle'),
        fields,
        enabledWhenOffline: true,
        previousPageID: getLegalNamePreviousPageID(input),
    };
}

function getOwnerDateOfBirthPage({answers, translate}: OwnersStepInput): FormPageConfig {
    const fields = [getDateOfBirthField(INPUT_IDS.OWNER_DOB, answers.ownerDob, translate)];
    return {
        kind: 'form',
        id: SUB_PAGES.DATE_OF_BIRTH,
        isComplete: answers.owners.length > 0 || isFormPageComplete(fields, translate),
        title: translate('beneficialOwnerInfoStep.enterTheDateOfBirthOfTheOwner'),
        fields,
        enabledWhenOffline: true,
    };
}

function getOwnerConfirmationPage({answers, isUserOwner, translate}: OwnersStepInput): ConfirmationPageConfig {
    return {
        kind: 'confirmation',
        id: SUB_PAGES.CONFIRMATION,
        isComplete: answers.owners.length > 0,
        title: translate('beneficialOwnerInfoStep.letsDoubleCheck'),
        rows: [
            {
                id: 'legalName',
                label: translate('beneficialOwnerInfoStep.legalName'),
                value: getOwnerFullName({firstName: answers.ownerFirstName, lastName: answers.ownerLastName}),
                editPageID: SUB_PAGES.LEGAL_NAME,
            },
            {id: 'dob', label: translate('common.dob'), value: answers.ownerDob, editPageID: SUB_PAGES.DATE_OF_BIRTH},
        ],
        onSubmit: () => {
            const editedOwner = findOwner(answers.owners, answers.ownerBeingModifiedID);
            const ownerID = editedOwner?.id ?? createOwnerID();
            const owners = commitOwner(answers.owners, getUSDOwnerFromBuffer(ownerID, answers));
            const shouldAskForMoreOwners = !editedOwner && canAddMoreUSDOwners(owners, isUserOwner);
            return {
                draftUpdate: {usdOwners: owners, ownerBeingModifiedID: ownerID},
                nextPageID: shouldAskForMoreOwners ? SUB_PAGES.ARE_THERE_MORE_UBOS : SUB_PAGES.UBOS_LIST,
            };
        },
    };
}

export {getOwnerConfirmationPage, getOwnerDateOfBirthPage, getOwnerLegalNamePage};
