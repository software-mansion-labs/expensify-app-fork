/**
 * The "Beneficial owners" step of the USD bank account setup as a DynamicForm schema: whether the user and anyone else owns 25% or more of the
 * company, then a list of the other owners. Page keys are the sub page names in the URL. The owners are drafted as a list under their own key,
 * since the bank account form keeps `beneficialOwners` as the JSON string the API takes.
 */
import type {DynamicFormValues} from '@components/DynamicForm/types';
import getAddressInputKeys from '@components/DynamicForm/utils/getAddressInputKeys';
import {getListItems} from '@components/DynamicForm/utils/listItems';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import CONST from '@src/CONST';
import INPUT_IDS from '@src/types/form/ReimbursementAccountForm';
import type {BeneficialOwnersStepProps} from '@src/types/form/ReimbursementAccountForm';
import type {DynamicFormSchema} from '@src/types/onyx';
import type {ACHData} from '@src/types/onyx/ReimbursementAccount';

const KEYS = INPUT_IDS.BENEFICIAL_OWNER_INFO_STEP;
const SUB_PAGE_NAMES = CONST.BANK_ACCOUNT.BENEFICIAL_OWNERS_STEP.SUB_PAGE_NAMES;
const OWNER_LIST_KEY = 'beneficialOwnerList';
const OWNER_ADDRESS_KEYS = getAddressInputKeys('street');

/** The bank account takes up to four owners, the user included */
const MAX_OWNERS = 4;

function getBeneficialOwnersForm(translate: LocalizedTranslate, companyName: string, isUserOwner: boolean) {
    return {
        pages: [
            {
                key: SUB_PAGE_NAMES.IS_USER_UBO,
                descriptionKey: 'beneficialOwnerInfoStep.regulationRequiresUsToVerifyTheIdentity',
                content: [{key: KEYS.OWNS_MORE_THAN_25_PERCENT, type: 'boolean', required: true, label: translate('beneficialOwnerInfoStep.doYouOwn25percent', companyName)}],
            },
            {
                key: SUB_PAGE_NAMES.IS_ANYONE_ELSE_UBO,
                descriptionKey: 'beneficialOwnerInfoStep.regulationRequiresUsToVerifyTheIdentity',
                content: [{key: KEYS.HAS_OTHER_BENEFICIAL_OWNERS, type: 'boolean', required: true, label: translate('beneficialOwnerInfoStep.doAnyIndividualOwn25percent', companyName)}],
            },
            {
                key: SUB_PAGE_NAMES.UBOS_LIST,
                descriptionKey: 'beneficialOwnerInfoStep.regulationRequiresUsToVerifyTheIdentity',
                showWhen: {key: KEYS.HAS_OTHER_BENEFICIAL_OWNERS, equals: ['true']},
                content: [
                    {
                        key: OWNER_LIST_KEY,
                        type: 'list',
                        required: true,
                        labelKey: 'beneficialOwnerInfoStep.owners',
                        itemLabelKey: 'common.owner',
                        maxItems: isUserOwner ? MAX_OWNERS - 1 : MAX_OWNERS,
                        itemFields: [
                            {key: 'firstName', type: 'text', required: true, rule: 'legalName', labelKey: 'beneficialOwnerInfoStep.legalFirstName'},
                            {key: 'lastName', type: 'text', required: true, rule: 'legalName', labelKey: 'beneficialOwnerInfoStep.legalLastName'},
                            {key: 'dob', type: 'date', required: true, rule: 'dateOfBirth', labelKey: 'common.dob'},
                            {
                                key: 'ssnLast4',
                                type: 'text',
                                required: true,
                                regex: CONST.REGEX.SSN_LAST_FOUR.source,
                                maxLength: CONST.BANK_ACCOUNT.MAX_LENGTH.SSN,
                                keyboard: 'numeric',
                                labelKey: 'personalInfoStep.last4SSN',
                            },
                            {key: OWNER_ADDRESS_KEYS.street, type: 'address', required: true, rule: 'zipCode', country: CONST.COUNTRY.US, labelKey: 'beneficialOwnerInfoStep.address'},
                        ],
                    },
                ],
            },
        ],
    } satisfies DynamicFormSchema;
}

/** The owners go to the API as a JSON list of their details, in the shape the old step sent, and the entry IDs go along as their keys */
function getBeneficialOwnersParams(answers: DynamicFormValues): Partial<BeneficialOwnersStepProps> {
    const owners = getListItems(answers[OWNER_LIST_KEY]);
    const ownerDetails = owners.map((owner) => {
        const getText = (key: string) => (typeof owner[key] === 'string' ? owner[key] : '');
        return {
            firstName: getText('firstName'),
            lastName: getText('lastName'),
            dob: getText('dob'),
            ssnLast4: getText('ssnLast4'),
            street: getText(OWNER_ADDRESS_KEYS.street),
            city: getText(OWNER_ADDRESS_KEYS.city),
            state: getText(OWNER_ADDRESS_KEYS.state),
            zipCode: getText(OWNER_ADDRESS_KEYS.zipCode),
        };
    });
    return {
        [KEYS.OWNS_MORE_THAN_25_PERCENT]: answers[KEYS.OWNS_MORE_THAN_25_PERCENT] === true,
        [KEYS.BENEFICIAL_OWNERS]: JSON.stringify(ownerDetails),
        beneficialOwnerKeys: owners.map((owner) => owner.id),
    };
}

/** The answers the bank account already holds. It sends no owner details back, so only whether there are other owners is known. */
function getBeneficialOwnersPrefill(achData: Pick<ACHData, typeof KEYS.OWNS_MORE_THAN_25_PERCENT | typeof KEYS.BENEFICIAL_OWNERS> | undefined): DynamicFormValues {
    return {
        [KEYS.OWNS_MORE_THAN_25_PERCENT]: achData?.[KEYS.OWNS_MORE_THAN_25_PERCENT],
        [KEYS.HAS_OTHER_BENEFICIAL_OWNERS]: achData?.[KEYS.BENEFICIAL_OWNERS]?.length ? true : undefined,
    };
}

export default getBeneficialOwnersForm;
export {getBeneficialOwnersParams, getBeneficialOwnersPrefill};
