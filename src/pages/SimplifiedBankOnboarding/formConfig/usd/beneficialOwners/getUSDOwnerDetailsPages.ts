/**
 * The detail pages of one USD owner for the shared owner step. The owner step is the same for both flows, so each
 * flow only supplies the pages that collect its owner details.
 */
import getDateOfBirthField from '@pages/SimplifiedBankOnboarding/formConfig/fields/getDateOfBirthField';
import getLegalNameFields from '@pages/SimplifiedBankOnboarding/formConfig/fields/getLegalNameFields';
import type {OwnerDetailsPage} from '@pages/SimplifiedBankOnboarding/formConfig/owners/types';
import type USDStepInput from '@pages/SimplifiedBankOnboarding/formConfig/usd/types';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';
import INPUT_IDS from '@pages/SimplifiedBankOnboarding/types/form';

const SUB_PAGES = SBO_CONST.USD.BENEFICIAL_OWNERS_SUB_PAGES;

/** A USD owner is a legal name and a date of birth, both kept in the owner buffer until the confirmation */
function getUSDOwnerDetailsPages({answers, translate}: USDStepInput): [OwnerDetailsPage, ...OwnerDetailsPage[]] {
    return [
        {
            kind: 'form',
            id: SUB_PAGES.LEGAL_NAME,
            title: translate('beneficialOwnerInfoStep.enterLegalFirstAndLastName'),
            description: translate('beneficialOwnerInfoStep.legalNameSubtitle'),
            fields: getLegalNameFields(
                {firstName: INPUT_IDS.OWNER_FIRST_NAME, lastName: INPUT_IDS.OWNER_LAST_NAME},
                {firstName: answers.ownerFirstName, lastName: answers.ownerLastName},
                translate,
            ),
            enabledWhenOffline: true,
        },
        {
            kind: 'form',
            id: SUB_PAGES.DATE_OF_BIRTH,
            title: translate('beneficialOwnerInfoStep.enterTheDateOfBirthOfTheOwner'),
            fields: [getDateOfBirthField(INPUT_IDS.OWNER_DOB, answers.ownerDob, translate)],
            enabledWhenOffline: true,
        },
    ];
}

export default getUSDOwnerDetailsPages;
