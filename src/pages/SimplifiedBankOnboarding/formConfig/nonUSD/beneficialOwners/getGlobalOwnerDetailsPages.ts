import getLegalNameFields from '@pages/SimplifiedBankOnboarding/formConfig/fields/getLegalNameFields';
import type NonUSDStepInput from '@pages/SimplifiedBankOnboarding/formConfig/nonUSD/types';
import type {OwnerDetailsPage} from '@pages/SimplifiedBankOnboarding/formConfig/owners/types';
import {isValidGlobalOwnerShare} from '@pages/SimplifiedBankOnboarding/model/owners/canAddMoreOwners';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

import CONST from '@src/CONST';

const SUB_PAGES = SBO_CONST.NON_USD.BENEFICIAL_OWNER_INFO_SUB_PAGES;

/** A NonUSD owner is a legal name and a share of 25% or more. The shares of all owners may not exceed 100%. */
function getGlobalOwnerDetailsPages({answers, translate}: NonUSDStepInput): [OwnerDetailsPage, ...OwnerDetailsPage[]] {
    const isUserEnteringOwnData = answers.ownerBeingModifiedID === SBO_CONST.NON_USD.CURRENT_USER_KEY;

    return [
        {
            kind: 'form',
            id: SUB_PAGES.NAME,
            title: translate(isUserEnteringOwnData ? 'ownershipInfoStep.whatsYourName' : 'ownershipInfoStep.whatsTheOwnersName'),
            description: translate(isUserEnteringOwnData ? 'personalInfoStep.legalNameSubtitle' : 'beneficialOwnerInfoStep.legalNameSubtitle'),
            fields: getLegalNameFields(
                {firstName: INPUT_IDS.OWNER_FIRST_NAME, lastName: INPUT_IDS.OWNER_LAST_NAME},
                {firstName: answers.ownerFirstName, lastName: answers.ownerLastName},
                translate,
            ),
            enabledWhenOffline: true,
        },
        {
            kind: 'form',
            id: SUB_PAGES.OWNERSHIP_PERCENTAGE,
            title: translate('ownershipInfoStep.whatPercentage'),
            fields: [
                {
                    type: 'text',
                    id: INPUT_IDS.OWNER_OWNERSHIP_PERCENTAGE,
                    label: translate('ownershipInfoStep.ownership'),
                    defaultValue: answers.ownerOwnershipPercentage,
                    inputMode: CONST.INPUT_MODE.NUMERIC,
                    isRequired: true,
                    validate: (value) => (isValidGlobalOwnerShare(value, answers.owners, answers.ownerBeingModifiedID) ? undefined : translate('bankAccount.error.ownershipPercentage')),
                },
            ],
            enabledWhenOffline: true,
        },
    ];
}

export default getGlobalOwnerDetailsPages;
