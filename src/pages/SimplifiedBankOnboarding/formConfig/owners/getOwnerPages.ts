import type {PageConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';

import type {Owner, OwnersStepDefinition} from './types';

import {getOwnerConfirmationPage, getOwnerDetailsPages} from './getOwnerDetailsPages';
import {getAreThereMoreOwnersPage, getIsAnyoneElseOwnerPage, getIsUserOwnerPage} from './getOwnerQuestionPages';
import getOwnersListPage from './getOwnersListPage';

/**
 * The pages of an owner step, shared by both flows. They follow the answers: the owner pages exist only when the flow
 * shows them, the question about more owners only once someone else owns 25% and the list only when it has someone to
 * show. A user who owns less than 25% and answers that nobody else does finishes the step on the second question.
 */
function getOwnerPages<TOwner extends Owner>(definition: OwnersStepDefinition<TOwner>): PageConfig[] {
    const {isUserOwner, hasOtherOwners, shouldShowOwnerPages} = definition;
    const ownerPages = shouldShowOwnerPages ? [...getOwnerDetailsPages(definition), getOwnerConfirmationPage(definition)] : [];
    const moreOwnersPages = hasOtherOwners ? [getAreThereMoreOwnersPage(definition)] : [];
    const listPages = isUserOwner || hasOtherOwners ? [getOwnersListPage(definition)] : [];
    return [getIsUserOwnerPage(definition), getIsAnyoneElseOwnerPage(definition), ...ownerPages, ...moreOwnersPages, ...listPages];
}

export default getOwnerPages;
