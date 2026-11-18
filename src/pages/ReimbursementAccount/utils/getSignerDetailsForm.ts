/**
 * The signer details of the "Signer info" step of the non-USD bank account setup as a DynamicForm schema.
 * Page keys are the sub page names in the URL, and field keys are the draft keys. The documents asked for depend on the currency and the bank's country.
 * The answers go to the API as one JSON string of details plus the first file of each document, in the shape the older pages sent.
 */
import type {DynamicFormValues} from '@components/DynamicForm/types';
import getAddressInputKeys from '@components/DynamicForm/utils/getAddressInputKeys';
import getFirstFile from '@components/DynamicForm/utils/getFirstFile';
import getTextAnswer from '@components/DynamicForm/utils/getTextAnswer';

import CONST from '@src/CONST';
import type {DynamicFormField, DynamicFormPage} from '@src/types/onyx';
import type {Corpay} from '@src/types/onyx/ReimbursementAccount';
import type {FileObject} from '@src/types/utils/Attachment';

import getNeededDocumentsStatusForSignerInfo from './getNeededDocumentsStatusForSignerInfo';

const KEYS = CONST.NON_USD_BANK_ACCOUNT.SIGNER_INFO_STEP.SIGNER_INFO_DATA;
const SUB_PAGE_NAMES = CONST.NON_USD_BANK_ACCOUNT.SIGNER_INFO_STEP.SUB_PAGE_NAMES;
const ADDRESS_KEYS = getAddressInputKeys(KEYS.STREET);
const FILE_KEYS = [KEYS.PROOF_OF_DIRECTORS, KEYS.ADDRESS_PROOF, KEYS.COPY_OF_ID, KEYS.CODICE_FISCALE];

const OWNER_DATA = CONST.NON_USD_BANK_ACCOUNT.BENEFICIAL_OWNER_INFO_STEP.BENEFICIAL_OWNER_DATA;
const OWNER_PREFIX = `${OWNER_DATA.PREFIX}_${CONST.NON_USD_BANK_ACCOUNT.CURRENT_USER_KEY}`;
const OWNER_ADDRESS_KEYS = getAddressInputKeys(`${OWNER_PREFIX}_${OWNER_DATA.STREET}`);

type SignerDetailsFormContext = {
    currency: string;
    country: string;

    /** The user's owner details already hold their name, date of birth and address, so those pages are left out */
    isUserOwner: boolean;
};

type SignerDetailsParams = {
    signerDetails: Record<string, string | boolean>;
    signerFiles: Record<string, FileObject>;
};

function getSignerDetailsForm({currency, country, isUserOwner}: SignerDetailsFormContext): {pages: DynamicFormPage[]} {
    const neededDocuments = getNeededDocumentsStatusForSignerInfo(currency, country);
    const documentFields: Array<[boolean, DynamicFormField]> = [
        [neededDocuments.isCopyOfIDNeeded, {key: KEYS.COPY_OF_ID, type: 'file', required: true, labelKey: 'signerInfoStep.id', descriptionKey: 'ownershipInfoStep.copyOfIDDescription'}],
        [
            neededDocuments.isAddressProofNeeded,
            {key: KEYS.ADDRESS_PROOF, type: 'file', required: true, labelKey: 'signerInfoStep.proofOf', descriptionKey: 'ownershipInfoStep.proofOfAddressDescription'},
        ],
        [
            neededDocuments.isProofOfDirectorsNeeded,
            {key: KEYS.PROOF_OF_DIRECTORS, type: 'file', required: true, labelKey: 'signerInfoStep.proofOfDirectors', descriptionKey: 'signerInfoStep.proofOfDirectorsDescription'},
        ],
        [
            neededDocuments.isCodiceFiscaleNeeded,
            {key: KEYS.CODICE_FISCALE, type: 'file', required: true, labelKey: 'signerInfoStep.codiceFiscale', descriptionKey: 'signerInfoStep.codiceFiscaleDescription'},
        ],
        [
            neededDocuments.isPRDAndFSGNeeded,
            {
                key: KEYS.DOWNLOADED_PDS_AND_FSG,
                type: 'boolean',
                presentation: 'download',
                documentPath: '/pdfs/PDSAndFSG.pdf',
                required: true,
                labelKey: 'signerInfoStep.PDSandFSG',
                descriptionKey: 'signerInfoStep.PDSandFSGDescription',
            },
        ],
    ];
    const namePage: DynamicFormPage = {
        key: SUB_PAGE_NAMES.NAME,
        titleKey: 'signerInfoStep.whatsYourName',
        content: [{key: KEYS.FULL_NAME, type: 'text', required: true, rule: 'legalName', labelKey: 'signerInfoStep.fullName'}],
    };
    const jobTitlePage: DynamicFormPage = {
        key: SUB_PAGE_NAMES.JOB_TITLE,
        titleKey: 'signerInfoStep.whatsYourJobTitle',
        content: [{key: KEYS.JOB_TITLE, type: 'text', required: true, labelKey: 'signerInfoStep.jobTitle'}],
    };
    const dateOfBirthPage: DynamicFormPage = {
        key: SUB_PAGE_NAMES.DATE_OF_BIRTH,
        titleKey: 'signerInfoStep.whatsYourDOB',
        content: [{key: KEYS.DATE_OF_BIRTH, type: 'date', required: true, rule: 'dateOfBirth', labelKey: 'common.dob'}],
    };
    const addressPage: DynamicFormPage = {
        key: SUB_PAGE_NAMES.ADDRESS,
        titleKey: 'ownershipInfoStep.whatsYourAddress',
        descriptionKey: 'personalInfoStep.addressSubtitle',
        content: [{key: KEYS.STREET, type: 'address', required: true, rule: 'zipCode', labelKey: 'ownershipInfoStep.address'}],
    };
    const uploadDocumentsPage: DynamicFormPage = {
        key: SUB_PAGE_NAMES.UPLOAD_DOCUMENTS,
        titleKey: 'ownershipInfoStep.uploadDocuments',
        descriptionKey: 'signerInfoStep.pleaseUpload',
        content: [{key: 'acceptedFiles', descriptionKey: 'ownershipInfoStep.acceptedFiles'}, ...documentFields.filter(([isNeeded]) => isNeeded).map(([, field]) => field)],
    };

    return {pages: isUserOwner ? [jobTitlePage, uploadDocumentsPage] : [namePage, jobTitlePage, dateOfBirthPage, addressPage, uploadDocumentsPage]};
}

/** Empty parts keep their place, so the saved address splits back into the same parts */
function joinAddress(values: DynamicFormValues, keys: ReturnType<typeof getAddressInputKeys>): string {
    const parts = [keys.street, keys.city, keys.state, keys.zipCode].map((key) => getTextAnswer(values[key]));
    return parts.some(Boolean) ? parts.join(', ') : '';
}

/**
 * The details and files the director information command takes. A user who owns 25% or more is not asked for their name, date of birth and address again,
 * so `ownerAnswers`, the bank account draft, gives them from the user's owner details.
 */
function getSignerDetailsParams(answers: DynamicFormValues, signerEmail: string, ownerAnswers?: DynamicFormValues): SignerDetailsParams {
    // The name, job title and date of birth are always sent, so the server can name the one that is missing
    const signerDetails: Record<string, string | boolean> = {
        [KEYS.FULL_NAME]: getTextAnswer(answers[KEYS.FULL_NAME]),
        [KEYS.EMAIL]: signerEmail,
        [KEYS.JOB_TITLE]: getTextAnswer(answers[KEYS.JOB_TITLE]),
        [KEYS.DATE_OF_BIRTH]: getTextAnswer(answers[KEYS.DATE_OF_BIRTH]),
    };
    const address = joinAddress(answers, ADDRESS_KEYS);
    if (address) {
        signerDetails[KEYS.ADDRESS] = address;
    }
    if (answers[KEYS.DOWNLOADED_PDS_AND_FSG] === true) {
        signerDetails[KEYS.DOWNLOADED_PDS_AND_FSG] = true;
    }
    if (ownerAnswers) {
        const getOwnerText = (field: string) => getTextAnswer(ownerAnswers[`${OWNER_PREFIX}_${field}`]);
        signerDetails[KEYS.FULL_NAME] = [getOwnerText(OWNER_DATA.FIRST_NAME), getOwnerText(OWNER_DATA.LAST_NAME)].filter(Boolean).join(' ');
        signerDetails[KEYS.DATE_OF_BIRTH] = getOwnerText(OWNER_DATA.DOB);
        signerDetails[KEYS.ADDRESS] = joinAddress(ownerAnswers, OWNER_ADDRESS_KEYS);
    }

    const signerFiles: Record<string, FileObject> = {};
    for (const key of FILE_KEYS) {
        const file = getFirstFile(answers[key]);
        if (file) {
            signerFiles[key] = file;
        }
    }
    return {signerDetails, signerFiles};
}

/** The signer details the bank account already holds, under the form's draft keys. The saved address is one string, split back into its parts. */
function getSignerDetailsPrefill(corpay: Partial<Corpay> | undefined): DynamicFormValues {
    const [street, city, state, zipCode] = corpay?.[KEYS.ADDRESS]?.split(', ') ?? [];
    return {
        [KEYS.FULL_NAME]: corpay?.[KEYS.FULL_NAME],
        [KEYS.JOB_TITLE]: corpay?.[KEYS.JOB_TITLE],
        [KEYS.DATE_OF_BIRTH]: corpay?.[KEYS.DATE_OF_BIRTH],
        [ADDRESS_KEYS.street]: street,
        [ADDRESS_KEYS.city]: city,
        [ADDRESS_KEYS.state]: state,
        [ADDRESS_KEYS.zipCode]: zipCode,
        [KEYS.DOWNLOADED_PDS_AND_FSG]: corpay?.[KEYS.DOWNLOADED_PDS_AND_FSG] ? true : undefined,
    };
}

export default getSignerDetailsForm;
export {getSignerDetailsParams, getSignerDetailsPrefill};
