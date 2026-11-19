import type {ListPageConfig, ListRow} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import {getUSDOwnerBuffer} from '@pages/SimplifiedBankOnboarding/model/owners/ownerBuffer';
import {findOwner} from '@pages/SimplifiedBankOnboarding/model/owners/ownerList';
import {getOwnerFullName} from '@pages/SimplifiedBankOnboarding/model/owners/ownerNames';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

import type OwnersStepInput from './types';

const SUB_PAGES = SBO_CONST.USD.BENEFICIAL_OWNERS_SUB_PAGES;

/** The row of the user. The user's details belong to the personal info step, so the row cannot be opened here. */
const REQUESTOR_ROW_ID = 'requestor';

function getRows({answers, isUserOwner, hasOtherOwners}: OwnersStepInput): ListRow[] {
    const requestorRows: ListRow[] = isUserOwner ? [{id: REQUESTOR_ROW_ID, title: getOwnerFullName(answers), description: answers.dob, isReadOnly: true}] : [];
    const ownerRows: ListRow[] = hasOtherOwners ? answers.owners.map((owner) => ({id: owner.id, title: getOwnerFullName(owner), description: owner.dob})) : [];
    return [...requestorRows, ...ownerRows];
}

/**
 * The owners that the step sends. A row opens the owner in the owner pages, not in edit mode, because Back from the
 * legal name page must return to this list.
 */
function getOwnersListPage(input: OwnersStepInput): ListPageConfig {
    const {answers, hasOtherOwners, canAddMoreOwners, translate} = input;
    return {
        kind: 'list',
        id: SUB_PAGES.UBOS_LIST,
        isComplete: true,
        title: translate('beneficialOwnerInfoStep.letsDoubleCheck'),
        description: translate('beneficialOwnerInfoStep.regulationRequiresUsToVerifyTheIdentity'),
        rowsTitle: `${translate('beneficialOwnerInfoStep.owners')}:`,
        rows: getRows(input),
        previousPageID: hasOtherOwners && canAddMoreOwners ? SUB_PAGES.ARE_THERE_MORE_UBOS : SUB_PAGES.IS_ANYONE_ELSE_UBO,
        onRowPress: (rowID) => ({
            draftUpdate: {...getUSDOwnerBuffer(findOwner(answers.owners, rowID)), ownerBeingModifiedID: rowID},
            nextPageID: SUB_PAGES.LEGAL_NAME,
        }),
    };
}

export default getOwnersListPage;
