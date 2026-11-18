/**
 * The "Personal info" step of the USD bank account setup as a DynamicForm schema.
 * Page keys are the sub page names in the URL, and field keys are the draft keys of the bank account form.
 * The form keeps the city, state and zip under the street's key, while the bank account keeps each under its own key, so the answers are mapped both ways here.
 */
import type {DynamicFormValues} from '@components/DynamicForm/types';
import getAddressInputKeys from '@components/DynamicForm/utils/getAddressInputKeys';

import CONST from '@src/CONST';
import INPUT_IDS from '@src/types/form/ReimbursementAccountForm';
import type {RequestorStepProps} from '@src/types/form/ReimbursementAccountForm';
import type {DynamicFormContentItem, DynamicFormSchema} from '@src/types/onyx';

const KEYS = INPUT_IDS.PERSONAL_INFO_STEP;
const SUB_PAGE_NAMES = CONST.BANK_ACCOUNT.PERSONAL_INFO_STEP.SUB_PAGE_NAMES;
const ADDRESS_KEYS = getAddressInputKeys(KEYS.STREET);

const helpLinks: DynamicFormContentItem[] = [
    {key: 'learnMore', url: CONST.BANK_ACCOUNT_PERSONAL_DOCUMENTATION_INFO_URL, textKey: 'requestorStep.learnMore'},
    {key: 'isMyDataSafe', url: CONST.PERSONAL_DATA_PROTECTION_INFO_URL, textKey: 'requestorStep.isMyDataSafe'},
];

const personalInfoForm = {
    pages: [
        {
            key: SUB_PAGE_NAMES.FULL_NAME,
            titleKey: 'personalInfoStep.enterYourLegalFirstAndLast',
            descriptionKey: 'personalInfoStep.legalNameSubtitle',
            sectionTitleKey: 'personalInfoStep.legalName',
            content: [
                {key: KEYS.FIRST_NAME, type: 'text', required: true, rule: 'legalName', labelKey: 'personalInfoStep.legalFirstName'},
                {key: KEYS.LAST_NAME, type: 'text', required: true, rule: 'legalName', labelKey: 'personalInfoStep.legalLastName'},
                ...helpLinks,
            ],
        },
        {
            key: SUB_PAGE_NAMES.DATE_OF_BIRTH,
            titleKey: 'personalInfoStep.enterYourDateOfBirth',
            content: [{key: KEYS.DOB, type: 'date', required: true, rule: 'dateOfBirth', labelKey: 'common.dob'}, ...helpLinks],
        },
        {
            key: SUB_PAGE_NAMES.SSN,
            titleKey: 'personalInfoStep.enterTheLast4',
            descriptionKey: 'personalInfoStep.dontWorry',
            content: [
                {
                    key: KEYS.SSN_LAST_4,
                    type: 'text',
                    required: true,
                    regex: CONST.REGEX.SSN_LAST_FOUR.source,
                    maxLength: CONST.BANK_ACCOUNT.MAX_LENGTH.SSN,
                    keyboard: 'numeric',
                    labelKey: 'personalInfoStep.last4SSN',
                },
            ],
        },
        {
            key: SUB_PAGE_NAMES.ADDRESS,
            titleKey: 'personalInfoStep.enterYourAddress',
            descriptionKey: 'personalInfoStep.addressSubtitle',
            content: [{key: KEYS.STREET, type: 'address', required: true, rule: 'zipCode', country: CONST.COUNTRY.US, labelKey: 'personalInfoStep.address'}],
        },
    ],
} satisfies DynamicFormSchema;

/** The form's answers under the names the bank account API takes them */
function getPersonalInfoParams(answers: DynamicFormValues, isOnfidoSetupComplete: boolean): RequestorStepProps {
    const getText = (key: string) => {
        const answer = answers[key];
        return typeof answer === 'string' ? answer : '';
    };
    return {
        [KEYS.FIRST_NAME]: getText(KEYS.FIRST_NAME),
        [KEYS.LAST_NAME]: getText(KEYS.LAST_NAME),
        [KEYS.DOB]: getText(KEYS.DOB),
        [KEYS.SSN_LAST_4]: getText(KEYS.SSN_LAST_4),
        [KEYS.STREET]: getText(ADDRESS_KEYS.street),
        [KEYS.CITY]: getText(ADDRESS_KEYS.city),
        [KEYS.STATE]: getText(ADDRESS_KEYS.state),
        [KEYS.ZIP_CODE]: getText(ADDRESS_KEYS.zipCode),
        [KEYS.IS_ONFIDO_SETUP_COMPLETE]: isOnfidoSetupComplete,
    };
}

/** The answers the bank account already holds, under the form's draft keys */
function getPersonalInfoPrefill(saved: Partial<RequestorStepProps> | undefined): DynamicFormValues {
    return {
        [KEYS.FIRST_NAME]: saved?.[KEYS.FIRST_NAME],
        [KEYS.LAST_NAME]: saved?.[KEYS.LAST_NAME],
        [KEYS.DOB]: saved?.[KEYS.DOB],
        [KEYS.SSN_LAST_4]: saved?.[KEYS.SSN_LAST_4],
        [ADDRESS_KEYS.street]: saved?.[KEYS.STREET],
        [ADDRESS_KEYS.city]: saved?.[KEYS.CITY],
        [ADDRESS_KEYS.state]: saved?.[KEYS.STATE],
        [ADDRESS_KEYS.zipCode]: saved?.[KEYS.ZIP_CODE],
    };
}

export default personalInfoForm;
export {getPersonalInfoParams, getPersonalInfoPrefill};
