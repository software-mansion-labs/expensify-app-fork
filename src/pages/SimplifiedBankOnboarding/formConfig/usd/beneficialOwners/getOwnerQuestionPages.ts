/**
 * The three yes or no questions of the owner step. Each one decides where the step goes next, and the two that lead to a
 * new owner clear the owner buffer first.
 */
import type {QuestionPageConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

import type OwnersStepInput from './types';

import getNewOwnerDraftUpdate from './getNewOwnerDraftUpdate';

const SUB_PAGES = SBO_CONST.USD.BENEFICIAL_OWNERS_SUB_PAGES;

function getIsUserOwnerPage({answers, translate}: OwnersStepInput): QuestionPageConfig {
    return {
        kind: 'question',
        id: SUB_PAGES.IS_USER_UBO,
        isComplete: answers.ownsMoreThan25Percent !== undefined,
        fieldID: INPUT_IDS.OWNS_MORE_THAN_25_PERCENT,
        title: translate('beneficialOwnerInfoStep.doYouOwn25percent', answers.companyName),
        description: translate('beneficialOwnerInfoStep.regulationRequiresUsToVerifyTheIdentity'),
        defaultValue: answers.ownsMoreThan25Percent ?? false,
        onSubmit: (values) => {
            // The user takes one of the places, so the last owner who no longer fits is dropped
            if (values.ownsMoreThan25Percent && answers.owners.length >= SBO_CONST.USD.MAX_NUMBER_OF_UBOS) {
                return {draftUpdate: {...values, usdOwners: answers.owners.slice(0, SBO_CONST.USD.MAX_NUMBER_OF_UBOS - 1)}};
            }
            return {};
        },
    };
}

function getIsAnyoneElseOwnerPage({answers, canAddMoreOwners, translate}: OwnersStepInput): QuestionPageConfig {
    return {
        kind: 'question',
        id: SUB_PAGES.IS_ANYONE_ELSE_UBO,
        isComplete: answers.hasOtherBeneficialOwners !== undefined,
        fieldID: INPUT_IDS.HAS_OTHER_BENEFICIAL_OWNERS,
        title: translate('beneficialOwnerInfoStep.doAnyIndividualOwn25percent', answers.companyName),
        description: translate('beneficialOwnerInfoStep.regulationRequiresUsToVerifyTheIdentity'),
        defaultValue: answers.hasOtherBeneficialOwners ?? false,
        onSubmit: (values) => {
            if (!values.hasOtherBeneficialOwners) {
                // Without other owners the list only shows the user, so a user who is no owner either finishes the step here
                return {};
            }
            if (canAddMoreOwners) {
                return {draftUpdate: getNewOwnerDraftUpdate(values), nextPageID: SUB_PAGES.LEGAL_NAME};
            }
            return {nextPageID: SUB_PAGES.UBOS_LIST};
        },
    };
}

function getAreThereMoreOwnersPage({answers, canAddMoreOwners, translate}: OwnersStepInput): QuestionPageConfig {
    return {
        kind: 'question',
        id: SUB_PAGES.ARE_THERE_MORE_UBOS,
        isComplete: answers.hasMoreBeneficialOwners !== undefined || !canAddMoreOwners,
        fieldID: INPUT_IDS.HAS_MORE_BENEFICIAL_OWNERS,
        title: translate('beneficialOwnerInfoStep.areThereMoreIndividualsWhoOwn25percent', answers.companyName),
        description: translate('beneficialOwnerInfoStep.regulationRequiresUsToVerifyTheIdentity'),
        defaultValue: false,
        onSubmit: (values) => {
            if (values.hasMoreBeneficialOwners) {
                return {draftUpdate: getNewOwnerDraftUpdate(values), nextPageID: SUB_PAGES.LEGAL_NAME};
            }
            return {nextPageID: SUB_PAGES.UBOS_LIST};
        },
    };
}

export {getAreThereMoreOwnersPage, getIsAnyoneElseOwnerPage, getIsUserOwnerPage};
