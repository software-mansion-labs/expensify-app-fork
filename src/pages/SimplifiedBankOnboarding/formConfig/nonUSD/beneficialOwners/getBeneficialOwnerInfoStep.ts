/**
 * The owner step of the NonUSD flow on the shared owner pages. The user is an owner in the list under a fixed ID, so a
 * user who owns 25% or more enters their own name and share before the question about other owners.
 */
import type NonUSDStepInput from '@pages/SimplifiedBankOnboarding/formConfig/nonUSD/types';
import getOwnerPages from '@pages/SimplifiedBankOnboarding/formConfig/owners/getOwnerPages';
import type {OwnersStepDefinition} from '@pages/SimplifiedBankOnboarding/formConfig/owners/types';
import type {ConfirmationRow, ListRow, PageTransition, StepConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import {canAddMoreGlobalOwners} from '@pages/SimplifiedBankOnboarding/model/owners/canAddMoreOwners';
import {getGlobalOwnerBuffer, getGlobalOwnerFromBuffer} from '@pages/SimplifiedBankOnboarding/model/owners/ownerBuffer';
import {findOwner, removeOwner} from '@pages/SimplifiedBankOnboarding/model/owners/ownerList';
import {getOwnerFullName} from '@pages/SimplifiedBankOnboarding/model/owners/ownerNames';
import saveGlobalOwners from '@pages/SimplifiedBankOnboarding/requests/nonUSD/saveGlobalOwners';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import type {GlobalOwnerDraft, OnboardingDraft} from '@pages/SimplifiedBankOnboarding/types/form';

import getGlobalOwnerDetailsPages from './getGlobalOwnerDetailsPages';

const SUB_PAGES = SBO_CONST.NON_USD.BENEFICIAL_OWNER_INFO_SUB_PAGES;
const {CURRENT_USER_KEY} = SBO_CONST.NON_USD;

function getConfirmationRows({answers, translate}: NonUSDStepInput): ConfirmationRow[] {
    return [
        {
            id: 'legalName',
            label: translate('ownershipInfoStep.legalName'),
            value: getOwnerFullName({firstName: answers.ownerFirstName, lastName: answers.ownerLastName}),
            editPageID: SUB_PAGES.NAME,
        },
        {id: 'ownershipPercentage', label: translate('ownershipInfoStep.ownershipPercentage'), value: `${answers.ownerOwnershipPercentage}%`, editPageID: SUB_PAGES.OWNERSHIP_PERCENTAGE},
    ];
}

function getListRows(owners: GlobalOwnerDraft[]): ListRow[] {
    return owners.map((owner) => ({id: owner.id, title: getOwnerFullName(owner), description: `${owner.ownershipPercentage}%`}));
}

/** An owner user enters their own details next, the user who is no owner leaves the list */
function getUserOwnerTransition({answers}: NonUSDStepInput, values: OnboardingDraft): PageTransition {
    if (values.ownsMoreThan25Percent) {
        return {
            draftUpdate: {...values, ...getGlobalOwnerBuffer(findOwner(answers.owners, CURRENT_USER_KEY)), ownerBeingModifiedID: CURRENT_USER_KEY},
            nextPageID: SUB_PAGES.NAME,
        };
    }
    return {draftUpdate: {...values, globalOwners: removeOwner(answers.owners, CURRENT_USER_KEY), ownerBeingModifiedID: null}};
}

/** The list keeps the owners of answers that the user took back, so the list and the request show only the owners the answers still allow */
function getOwnersToSend(owners: GlobalOwnerDraft[], isUserOwner: boolean, hasOtherOwners: boolean | undefined): GlobalOwnerDraft[] {
    return owners.filter((owner) => (owner.id === CURRENT_USER_KEY ? isUserOwner : !!hasOtherOwners));
}

function getOwnersDefinition(input: NonUSDStepInput, isUserOwner: boolean, hasOtherOwners: boolean | undefined): OwnersStepDefinition<GlobalOwnerDraft> {
    const {answers, translate} = input;
    return {
        subPages: {
            isUserOwner: SUB_PAGES.IS_USER_BENEFICIAL_OWNER,
            isAnyoneElseOwner: SUB_PAGES.IS_ANYONE_ELSE_BENEFICIAL_OWNER,
            confirmation: SUB_PAGES.CONFIRMATION,
            areThereMoreOwners: SUB_PAGES.ARE_THERE_MORE_BENEFICIAL_OWNERS,
            ownersList: SUB_PAGES.BENEFICIAL_OWNERS_LIST,
        },
        answers,
        isUserOwner,
        hasOtherOwners,
        shouldShowOwnerPages: isUserOwner || !!hasOtherOwners,
        canAddMoreOwners: canAddMoreGlobalOwners,
        userOwnerID: CURRENT_USER_KEY,
        detailsPages: getGlobalOwnerDetailsPages(input),
        confirmationTitle: translate('ownershipInfoStep.letsDoubleCheck'),
        confirmationRows: getConfirmationRows(input),
        listRows: getListRows(getOwnersToSend(answers.owners, isUserOwner, hasOtherOwners)),
        copy: {
            isUserOwnerTitle: translate('ownershipInfoStep.doYouOwn', answers.companyName),
            isAnyoneElseOwnerTitle: translate('ownershipInfoStep.doesAnyoneOwn', answers.companyName),
            areThereMoreOwnersTitle: translate('ownershipInfoStep.areThereOther', answers.companyName),
            description: translate('ownershipInfoStep.regulationsRequire'),
        },
        getOwnerBuffer: getGlobalOwnerBuffer,
        getOwnerFromBuffer: getGlobalOwnerFromBuffer,
        getOwnersDraftUpdate: (owners) => ({globalOwners: owners}),
        onUserOwnerAnswer: (values) => getUserOwnerTransition(input, values),
        translate,
    };
}

function getBeneficialOwnerInfoStep(input: NonUSDStepInput): StepConfig {
    const {answers, corpay, bankAccount, translate} = input;
    const isUserOwner = answers.ownsMoreThan25Percent ?? false;
    const hasOtherOwners = answers.hasOtherBeneficialOwners;

    return {
        id: SBO_CONST.NON_USD.PAGE_NAMES.BENEFICIAL_OWNER_INFO,
        title: translate('ownershipInfoStep.ownerInfo'),
        counterIndex: 3,
        isComplete: corpay?.anyIndividualOwn25PercentOrMore !== undefined,
        pages: getOwnerPages(getOwnersDefinition(input, isUserOwner, hasOtherOwners)),
        submit: () => saveGlobalOwners(bankAccount, {ownsMoreThan25Percent: isUserOwner, owners: getOwnersToSend(answers.owners, isUserOwner, hasOtherOwners)}),
        requestName: REQUEST_NAMES.SAVE_GLOBAL_OWNERS,
    };
}

export default getBeneficialOwnerInfoStep;
