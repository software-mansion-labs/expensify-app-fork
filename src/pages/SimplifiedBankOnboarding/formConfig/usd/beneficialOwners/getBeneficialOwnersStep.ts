import getOwnerPages from '@pages/SimplifiedBankOnboarding/formConfig/owners/getOwnerPages';
/**
 * The owner step of the USD flow on the shared owner pages. The user is the requestor and stays out of the list, so the
 * owner pages exist only once the user said that someone else owns 25% or more.
 */
import type {OwnersStepDefinition} from '@pages/SimplifiedBankOnboarding/formConfig/owners/types';
import type {ConfirmationRow, ListRow, PageTransition, StepConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import hasPassedServerStep from '@pages/SimplifiedBankOnboarding/formConfig/usd/hasPassedServerStep';
import type USDStepInput from '@pages/SimplifiedBankOnboarding/formConfig/usd/types';
import {canAddMoreUSDOwners} from '@pages/SimplifiedBankOnboarding/model/owners/canAddMoreOwners';
import {getUSDOwnerBuffer, getUSDOwnerFromBuffer} from '@pages/SimplifiedBankOnboarding/model/owners/ownerBuffer';
import {getOwnerFullName} from '@pages/SimplifiedBankOnboarding/model/owners/ownerNames';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import saveOwners from '@pages/SimplifiedBankOnboarding/requests/usd/saveOwners';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {OnboardingDraft, USDOwnerDraft} from '@pages/SimplifiedBankOnboarding/types/form';

import getUSDOwnerDetailsPages from './getUSDOwnerDetailsPages';

const SUB_PAGES = SBO_CONST.USD.BENEFICIAL_OWNERS_SUB_PAGES;

/** The row of the user. The user's details belong to the personal info step, so the row cannot be opened here. */
const REQUESTOR_ROW_ID = 'requestor';

function getListRows({answers}: USDStepInput, isUserOwner: boolean, hasOtherOwners: boolean | undefined): ListRow[] {
    const requestorRows: ListRow[] = isUserOwner ? [{id: REQUESTOR_ROW_ID, title: getOwnerFullName(answers), description: answers.dob, isReadOnly: true}] : [];
    const ownerRows: ListRow[] = hasOtherOwners ? answers.owners.map((owner) => ({id: owner.id, title: getOwnerFullName(owner), description: owner.dob})) : [];
    return [...requestorRows, ...ownerRows];
}

function getConfirmationRows({answers, translate}: USDStepInput): ConfirmationRow[] {
    return [
        {
            id: 'legalName',
            label: translate('beneficialOwnerInfoStep.legalName'),
            value: getOwnerFullName({firstName: answers.ownerFirstName, lastName: answers.ownerLastName}),
            editPageID: SUB_PAGES.LEGAL_NAME,
        },
        {id: 'dob', label: translate('common.dob'), value: answers.ownerDob, editPageID: SUB_PAGES.DATE_OF_BIRTH},
    ];
}

/** The user takes one of the places, so the last owner who no longer fits is dropped */
function getUserOwnerTransition({answers}: USDStepInput, values: OnboardingDraft): PageTransition {
    if (values.ownsMoreThan25Percent && answers.owners.length >= SBO_CONST.USD.MAX_NUMBER_OF_UBOS) {
        return {draftUpdate: {...values, usdOwners: answers.owners.slice(0, SBO_CONST.USD.MAX_NUMBER_OF_UBOS - 1)}};
    }
    return {};
}

function getOwnersDefinition(input: USDStepInput, isUserOwner: boolean, hasOtherOwners: boolean | undefined): OwnersStepDefinition<USDOwnerDraft> {
    const {answers, translate} = input;
    return {
        subPages: {
            isUserOwner: SUB_PAGES.IS_USER_UBO,
            isAnyoneElseOwner: SUB_PAGES.IS_ANYONE_ELSE_UBO,
            confirmation: SUB_PAGES.CONFIRMATION,
            areThereMoreOwners: SUB_PAGES.ARE_THERE_MORE_UBOS,
            ownersList: SUB_PAGES.UBOS_LIST,
        },
        answers,
        isUserOwner,
        hasOtherOwners,
        shouldShowOwnerPages: !!hasOtherOwners,
        canAddMoreOwners: (owners) => canAddMoreUSDOwners(owners, isUserOwner),
        detailsPages: getUSDOwnerDetailsPages(input),
        confirmationTitle: translate('beneficialOwnerInfoStep.letsDoubleCheck'),
        confirmationRows: getConfirmationRows(input),
        listRows: getListRows(input, isUserOwner, hasOtherOwners),
        copy: {
            isUserOwnerTitle: translate('beneficialOwnerInfoStep.doYouOwn25percent', answers.companyName),
            isAnyoneElseOwnerTitle: translate('beneficialOwnerInfoStep.doAnyIndividualOwn25percent', answers.companyName),
            areThereMoreOwnersTitle: translate('beneficialOwnerInfoStep.areThereMoreIndividualsWhoOwn25percent', answers.companyName),
            description: translate('beneficialOwnerInfoStep.regulationRequiresUsToVerifyTheIdentity'),
        },
        getOwnerBuffer: getUSDOwnerBuffer,
        getOwnerFromBuffer: getUSDOwnerFromBuffer,
        getOwnersDraftUpdate: (owners) => ({usdOwners: owners}),
        onUserOwnerAnswer: (values) => getUserOwnerTransition(input, values),
        translate,
    };
}

function getBeneficialOwnersStep(input: USDStepInput): StepConfig {
    const {answers, achData, bankAccount, translate} = input;
    const isUserOwner = answers.ownsMoreThan25Percent ?? false;
    const hasOtherOwners = answers.hasOtherBeneficialOwners;

    return {
        id: SBO_CONST.USD.PAGE_NAMES.BENEFICIAL_OWNERS,
        title: translate('beneficialOwnerInfoStep.companyOwner'),
        counterIndex: 4,
        isComplete: hasPassedServerStep(achData, SBO_CONST.USD.STEP.BENEFICIAL_OWNERS),
        pages: getOwnerPages(getOwnersDefinition(input, isUserOwner, hasOtherOwners)),
        submit: () => saveOwners(bankAccount, {ownsMoreThan25Percent: isUserOwner, owners: hasOtherOwners ? answers.owners : []}),
        requestName: REQUEST_NAMES.SAVE_OWNERS,
    };
}

export default getBeneficialOwnersStep;
