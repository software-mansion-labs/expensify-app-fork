import type {ListPageConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import {findOwner} from '@pages/SimplifiedBankOnboarding/model/owners/ownerList';

import type {Owner, OwnersStepDefinition} from './types';

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
            draftUpdate: {...getOwnerBuffer(findOwner(answers.owners, rowID)), ownerBeingModifiedID: rowID},
            nextPageID: detailsPages[0].id,
        }),
    };
}

export default getOwnersListPage;
