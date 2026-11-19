import type {PageConfig, StepConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import hasPassedServerStep from '@pages/SimplifiedBankOnboarding/formConfig/usd/hasPassedServerStep';
import type USDStepInput from '@pages/SimplifiedBankOnboarding/formConfig/usd/types';
import {canAddMoreUSDOwners} from '@pages/SimplifiedBankOnboarding/model/owners/canAddMoreOwners';
import REQUEST_NAMES from '@pages/SimplifiedBankOnboarding/requests/REQUEST_NAMES';
import saveOwners from '@pages/SimplifiedBankOnboarding/requests/usd/saveOwners';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import type OwnersStepInput from './types';

import {getOwnerConfirmationPage, getOwnerDateOfBirthPage, getOwnerLegalNamePage} from './getOwnerDetailsPages';
import {getAreThereMoreOwnersPage, getIsAnyoneElseOwnerPage, getIsUserOwnerPage} from './getOwnerQuestionPages';
import getOwnersListPage from './getOwnersListPage';

/**
 * The pages follow the answers: the owner pages exist only once the user said that someone else owns 25% or more, and
 * the list only when it has someone to show. A user who owns less than 25% and answers that nobody else does finishes
 * the step on the second question, because no page follows it.
 */
function getPages(input: OwnersStepInput): PageConfig[] {
    const ownerPages = input.hasOtherOwners ? [getOwnerLegalNamePage(input), getOwnerDateOfBirthPage(input), getOwnerConfirmationPage(input), getAreThereMoreOwnersPage(input)] : [];
    const listPages = input.isUserOwner || input.hasOtherOwners ? [getOwnersListPage(input)] : [];
    return [getIsUserOwnerPage(input), getIsAnyoneElseOwnerPage(input), ...ownerPages, ...listPages];
}

function getBeneficialOwnersStep(input: USDStepInput): StepConfig {
    const {answers, achData, bankAccount, translate} = input;
    const isUserOwner = answers.ownsMoreThan25Percent ?? false;
    const hasOtherOwners = answers.hasOtherBeneficialOwners;
    const ownersInput: OwnersStepInput = {...input, isUserOwner, hasOtherOwners, canAddMoreOwners: canAddMoreUSDOwners(answers.owners, isUserOwner)};

    return {
        id: SBO_CONST.USD.PAGE_NAMES.BENEFICIAL_OWNERS,
        title: translate('beneficialOwnerInfoStep.companyOwner'),
        counterIndex: 4,
        isComplete: hasPassedServerStep(achData, SBO_CONST.USD.STEP.BENEFICIAL_OWNERS),
        pages: getPages(ownersInput),
        submit: () => saveOwners(bankAccount, {ownsMoreThan25Percent: isUserOwner, owners: hasOtherOwners ? answers.owners : []}),
        requestName: REQUEST_NAMES.SAVE_OWNERS,
    };
}

export default getBeneficialOwnersStep;
