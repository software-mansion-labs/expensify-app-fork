/**
 * The "Beneficial owners" step of the non-USD bank account setup as a DynamicForm schema: whether the user owns 25% or more of the company and their
 * details, then whether anyone else does and a list of those owners. The user's answers are drafted under `beneficialOwner_currentUser_<field>`, which
 * the signer step reads too. The other owners are drafted as a list under their own key.
 */
import type {DynamicFormValues} from '@components/DynamicForm/types';
import getAddressInputKeys from '@components/DynamicForm/utils/getAddressInputKeys';
import {getListItems} from '@components/DynamicForm/utils/listItems';
import type {LocalizedTranslate} from '@components/LocaleContextProvider';

import type SaveCorpayOnboardingBeneficialOwnerParams from '@libs/API/parameters/SaveCorpayOnboardingBeneficialOwnerParams';

import getNeededDocumentsStatusForBeneficialOwner from '@pages/ReimbursementAccount/NonUSD/utils/getNeededDocumentsStatusForBeneficialOwner';

import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';
import INPUT_IDS from '@src/types/form/ReimbursementAccountForm';
import type {BeneficialOwnerDataKey} from '@src/types/form/ReimbursementAccountForm';
import type {DynamicFormField, DynamicFormPage, DynamicFormSchema} from '@src/types/onyx';
import type {Corpay} from '@src/types/onyx/ReimbursementAccount';
import type {FileObject} from '@src/types/utils/Attachment';

const {OWNS_MORE_THAN_25_PERCENT, ANY_INDIVIDUAL_OWN_25_PERCENT_OR_MORE, BENEFICIAL_OWNERS} = INPUT_IDS.ADDITIONAL_DATA.CORPAY;
const SUB_PAGE_NAMES = CONST.NON_USD_BANK_ACCOUNT.BENEFICIAL_OWNER_INFO_STEP.SUB_PAGE_NAMES;
const OWNER_DATA = CONST.NON_USD_BANK_ACCOUNT.BENEFICIAL_OWNER_INFO_STEP.BENEFICIAL_OWNER_DATA;
const CURRENT_USER_KEY = CONST.NON_USD_BANK_ACCOUNT.CURRENT_USER_KEY;
const OWNER_LIST_KEY = 'corpayBeneficialOwnerList';
const ADDRESS_KEYS = getAddressInputKeys(OWNER_DATA.STREET);
const FILE_KEYS = [OWNER_DATA.PROOF_OF_OWNERSHIP, OWNER_DATA.COPY_OF_ID, OWNER_DATA.ADDRESS_PROOF, OWNER_DATA.CODICE_FISCALE];

/** The user's answers are drafted under these keys, followed by the field's key */
const CURRENT_USER_PREFIX = `${OWNER_DATA.PREFIX}_${CURRENT_USER_KEY}_`;

/** The bank account takes up to four owners, the user included */
const MAX_OWNERS = 4;

/** The owners together hold at most the whole company */
const MAX_TOTAL_OWNERSHIP_PERCENTAGE = 100;

/** An owner holds from 25% to 100% of the company, fractions included */
const OWNERSHIP_PERCENTAGE_REGEX = /^((2[5-9]|[3-9]\d)(\.\d+)?|100(\.0+)?)$/;

const COUNTRIES_EXCEPT_GB = Object.keys(CONST.ALL_COUNTRIES).filter((country) => country !== CONST.COUNTRY.GB);

type NeededDocumentsStatus = ReturnType<typeof getNeededDocumentsStatusForBeneficialOwner>;

/** A document Corpay asks for is shown always, only for owners living outside the UK, or never */
function getDocumentFields(prefix: string, currency: string, accountCountry: string): DynamicFormField[] {
    const neededInGB = getNeededDocumentsStatusForBeneficialOwner(currency, accountCountry, CONST.COUNTRY.GB);
    const neededElsewhere = getNeededDocumentsStatusForBeneficialOwner(currency, accountCountry, '');
    const proofOfOwnershipDescriptionKey =
        accountCountry === CONST.COUNTRY.CA ? 'ownershipInfoStep.proofOfBeneficialOwnerDescriptionCA' : 'ownershipInfoStep.proofOfBeneficialOwnerDescription';
    const documents: Array<{key: string; status: keyof NeededDocumentsStatus; labelKey: TranslationPaths; descriptionKey: TranslationPaths}> = [
        {key: OWNER_DATA.PROOF_OF_OWNERSHIP, status: 'isProofOfOwnershipNeeded', labelKey: 'ownershipInfoStep.proofOfBeneficialOwner', descriptionKey: proofOfOwnershipDescriptionKey},
        {key: OWNER_DATA.COPY_OF_ID, status: 'isCopyOfIDNeeded', labelKey: 'ownershipInfoStep.copyOfID', descriptionKey: 'ownershipInfoStep.copyOfIDDescription'},
        {key: OWNER_DATA.ADDRESS_PROOF, status: 'isProofOfAddressNeeded', labelKey: 'ownershipInfoStep.proofOfAddress', descriptionKey: 'ownershipInfoStep.proofOfAddressDescription'},
        {key: OWNER_DATA.CODICE_FISCALE, status: 'isCodiceFiscaleNeeded', labelKey: 'ownershipInfoStep.codiceFiscale', descriptionKey: 'ownershipInfoStep.codiceFiscaleDescription'},
    ];
    return documents
        .filter(({status}) => neededElsewhere[status])
        .map(({key, status, labelKey, descriptionKey}) => ({
            key: `${prefix}${key}`,
            type: 'file',
            required: true,
            labelKey,
            descriptionKey,
            showWhen: neededInGB[status] ? undefined : {key: `${prefix}${ADDRESS_KEYS.country}`, equals: COUNTRIES_EXCEPT_GB},
        }));
}

/** One owner's questions on the pages that ask them. `prefix` goes before every key, so the user's answers and an entry's answers can share them. */
function getOwnerPages(prefix: string, currency: string, accountCountry: string): DynamicFormPage[] {
    return [
        {
            key: SUB_PAGE_NAMES.NAME,
            titleKey: 'ownershipInfoStep.whatsYourName',
            descriptionKey: 'personalInfoStep.legalNameSubtitle',
            content: [
                {key: `${prefix}${OWNER_DATA.FIRST_NAME}`, type: 'text', required: true, rule: 'legalName', labelKey: 'beneficialOwnerInfoStep.legalFirstName'},
                {key: `${prefix}${OWNER_DATA.LAST_NAME}`, type: 'text', required: true, rule: 'legalName', labelKey: 'beneficialOwnerInfoStep.legalLastName'},
            ],
        },
        {
            key: SUB_PAGE_NAMES.NATIONALITY,
            titleKey: 'ownershipInfoStep.whatsYourNationality',
            content: [{key: `${prefix}${OWNER_DATA.NATIONALITY}`, type: 'country', required: true, labelKey: 'ownershipInfoStep.countryOfCitizenship'}],
        },
        {
            key: SUB_PAGE_NAMES.OWNERSHIP_PERCENTAGE,
            titleKey: 'ownershipInfoStep.whatsYoursPercentage',
            content: [
                {
                    key: `${prefix}${OWNER_DATA.OWNERSHIP_PERCENTAGE}`,
                    type: 'number',
                    required: true,
                    regex: OWNERSHIP_PERCENTAGE_REGEX.source,
                    example: '25',
                    labelKey: 'ownershipInfoStep.ownership',
                },
            ],
        },
        {
            key: SUB_PAGE_NAMES.DATE_OF_BIRTH,
            titleKey: 'ownershipInfoStep.whatsYourDOB',
            content: [{key: `${prefix}${OWNER_DATA.DOB}`, type: 'date', required: true, rule: 'dateOfBirth', labelKey: 'common.dob'}],
        },
        {
            key: SUB_PAGE_NAMES.ADDRESS,
            titleKey: 'ownershipInfoStep.whatsYourAddress',
            descriptionKey: 'personalInfoStep.addressSubtitle',
            content: [{key: `${prefix}${ADDRESS_KEYS.street}`, type: 'address', required: true, rule: 'zipCode', labelKey: 'ownershipInfoStep.address'}],
        },
        {
            key: SUB_PAGE_NAMES.SSN,
            titleKey: 'ownershipInfoStep.whatsYourSSN',
            descriptionKey: 'beneficialOwnerInfoStep.dontWorry',
            content: [
                {
                    key: `${prefix}${OWNER_DATA.SSN}`,
                    type: 'text',
                    required: true,
                    regex: CONST.REGEX.SSN_FULL_NINE.source,
                    maxLength: CONST.BANK_ACCOUNT.MAX_LENGTH.FULL_SSN,
                    keyboard: 'numeric',
                    labelKey: 'common.ssnFull9',
                    showWhen: {key: `${prefix}${OWNER_DATA.NATIONALITY}`, equals: [CONST.COUNTRY.US]},
                },
            ],
        },
        {
            key: SUB_PAGE_NAMES.DOCUMENTS,
            titleKey: 'ownershipInfoStep.uploadDocuments',
            descriptionKey: 'ownershipInfoStep.pleaseUpload',
            content: getDocumentFields(prefix, currency, accountCountry),
        },
    ];
}

function getBeneficialOwnerInfoForm(translate: LocalizedTranslate, companyName: string, isUserOwner: boolean, currency: string, accountCountry: string) {
    const isUserOwnerCondition = {key: OWNS_MORE_THAN_25_PERCENT, equals: ['true']};
    return {
        pages: [
            {
                key: SUB_PAGE_NAMES.IS_USER_BENEFICIAL_OWNER,
                descriptionKey: 'ownershipInfoStep.regulationsRequire',
                content: [{key: OWNS_MORE_THAN_25_PERCENT, type: 'boolean', required: true, label: translate('ownershipInfoStep.doYouOwn', companyName)}],
            },
            ...getOwnerPages(CURRENT_USER_PREFIX, currency, accountCountry).map((page) => ({...page, showWhen: isUserOwnerCondition})),
            {
                key: SUB_PAGE_NAMES.IS_ANYONE_ELSE_BENEFICIAL_OWNER,
                descriptionKey: 'ownershipInfoStep.regulationsRequire',
                content: [{key: ANY_INDIVIDUAL_OWN_25_PERCENT_OR_MORE, type: 'boolean', required: true, label: translate('ownershipInfoStep.doesAnyoneOwn', companyName)}],
            },
            {
                key: SUB_PAGE_NAMES.BENEFICIAL_OWNERS_LIST,
                descriptionKey: 'beneficialOwnerInfoStep.regulationRequiresUsToVerifyTheIdentity',
                showWhen: {key: ANY_INDIVIDUAL_OWN_25_PERCENT_OR_MORE, equals: ['true']},
                content: [
                    {
                        key: OWNER_LIST_KEY,
                        type: 'list',
                        required: true,
                        labelKey: 'beneficialOwnerInfoStep.owners',
                        itemLabelKey: 'common.owner',
                        maxItems: isUserOwner ? MAX_OWNERS - 1 : MAX_OWNERS,
                        itemFields: getOwnerPages('', currency, accountCountry).flatMap((page) => page.content.filter((item): item is DynamicFormField => 'type' in item)),
                    },
                ],
            },
        ],
    } satisfies DynamicFormSchema;
}

function getText(owner: DynamicFormValues, key: string): string {
    const value = owner[key];
    return typeof value === 'string' ? value : '';
}

function getFirstFile(value: unknown): FileObject | undefined {
    if (!Array.isArray(value)) {
        return undefined;
    }
    const files: unknown[] = value;
    return files.find((file): file is FileObject => typeof file === 'object' && file !== null);
}

/** The owners the answers name, keyed by their ID, each with the answers of its own fields */
function getOwners(answers: DynamicFormValues): Array<[id: string, owner: DynamicFormValues]> {
    const owners: Array<[id: string, owner: DynamicFormValues]> = [];
    if (answers[OWNS_MORE_THAN_25_PERCENT] === true) {
        const userAnswers = Object.entries(answers).flatMap(([key, value]) => (key.startsWith(CURRENT_USER_PREFIX) ? [[key.slice(CURRENT_USER_PREFIX.length), value]] : []));
        owners.push([CURRENT_USER_KEY, Object.fromEntries(userAnswers)]);
    }
    if (answers[ANY_INDIVIDUAL_OWN_25_PERCENT_OR_MORE] === true) {
        owners.push(...getListItems(answers[OWNER_LIST_KEY]).map((owner): [string, DynamicFormValues] => [owner.id, owner]));
    }
    return owners;
}

/** The owners as the Corpay onboarding API takes them, in the shape the old step sent: details in `inputs` and the first file of each document as its own parameter */
function getBeneficialOwnerInfoParams(answers: DynamicFormValues, bankAccountID: number): SaveCorpayOnboardingBeneficialOwnerParams {
    const owners = getOwners(answers);
    const ownerDetails: Record<BeneficialOwnerDataKey, string> = {};
    const ownerFiles: Record<BeneficialOwnerDataKey, FileObject> = {};
    for (const [id, owner] of owners) {
        const details: Record<string, string> = {
            [OWNER_DATA.FULL_NAME]: [getText(owner, OWNER_DATA.FIRST_NAME), getText(owner, OWNER_DATA.LAST_NAME)].filter(Boolean).join(' '),
            [OWNER_DATA.OWNERSHIP_PERCENTAGE]: getText(owner, OWNER_DATA.OWNERSHIP_PERCENTAGE),
            [OWNER_DATA.DOB]: getText(owner, OWNER_DATA.DOB),
            // Corpay asks for the full SSN of US citizens only
            [OWNER_DATA.SSN]: getText(owner, OWNER_DATA.NATIONALITY) === CONST.COUNTRY.US ? getText(owner, OWNER_DATA.SSN) : '',
            [OWNER_DATA.RESIDENTIAL_ADDRESS]: [ADDRESS_KEYS.street, ADDRESS_KEYS.city, ADDRESS_KEYS.state, ADDRESS_KEYS.zipCode, ADDRESS_KEYS.country]
                .map((key) => getText(owner, key))
                .filter(Boolean)
                .join(', '),
            [OWNER_DATA.NATIONALITY]: getText(owner, OWNER_DATA.NATIONALITY),
        };
        for (const [field, value] of Object.entries(details)) {
            if (value) {
                ownerDetails[`${OWNER_DATA.PREFIX}_${id}_${field}`] = value;
            }
        }
        for (const fileKey of FILE_KEYS) {
            const file = getFirstFile(owner[fileKey]);
            if (file) {
                ownerFiles[`${OWNER_DATA.PREFIX}_${id}_${fileKey}`] = file;
            }
        }
    }
    return {
        inputs: JSON.stringify({...ownerDetails, [ANY_INDIVIDUAL_OWN_25_PERCENT_OR_MORE]: owners.length > 0}),
        ...ownerFiles,
        beneficialOwnerIDs: owners.length > 0 ? owners.map(([id]) => id).join(',') : undefined,
        bankAccountID,
    };
}

/** The owners' shares add up to at most 100%, so the page that changes one of them is checked against the others */
function getOwnershipTotalErrors(page: DynamicFormPage, values: DynamicFormValues, translate: LocalizedTranslate): Record<string, string> {
    const total = getOwners(values).reduce((sum, [, owner]) => sum + (Number(getText(owner, OWNER_DATA.OWNERSHIP_PERCENTAGE)) || 0), 0);
    const pageKeys = new Set(page.content.map((item) => item.key));
    const errorKey = [`${CURRENT_USER_PREFIX}${OWNER_DATA.OWNERSHIP_PERCENTAGE}`, OWNER_LIST_KEY].find((key) => pageKeys.has(key));
    return total > MAX_TOTAL_OWNERSHIP_PERCENTAGE && errorKey ? {[errorKey]: translate('bankAccount.error.ownershipPercentage')} : {};
}

/** The owners the bank account already holds. The server keeps their details in single strings, so names and addresses are split back into their parts. */
function getBeneficialOwnerInfoPrefill(corpay: Partial<Corpay> | undefined): DynamicFormValues {
    const savedOwners = (corpay?.[BENEFICIAL_OWNERS] ?? []).flatMap((owner) => {
        if (!owner.uid) {
            return [];
        }
        const [firstName = '', ...otherNames] = (owner.fullName ?? '').trim().split(' ');
        const [street, city, state, zipCode, country] = (owner.residentialAddress ?? '').split(', ');
        const answers: DynamicFormValues = {
            [OWNER_DATA.FIRST_NAME]: firstName,
            [OWNER_DATA.LAST_NAME]: otherNames.at(-1),
            [OWNER_DATA.NATIONALITY]: owner.nationality,
            [OWNER_DATA.OWNERSHIP_PERCENTAGE]: owner.ownershipPercentage,
            [OWNER_DATA.DOB]: owner.dob,
            [ADDRESS_KEYS.street]: street,
            [ADDRESS_KEYS.city]: city,
            [ADDRESS_KEYS.state]: state,
            [ADDRESS_KEYS.zipCode]: zipCode,
            [ADDRESS_KEYS.country]: country,
        };
        return [{id: owner.uid, ...answers}];
    });
    const savedUser = savedOwners.find((owner) => owner.id === CURRENT_USER_KEY);
    const otherOwners = savedOwners.filter((owner) => owner !== savedUser);
    const userAnswers = savedUser ? Object.fromEntries(Object.entries(savedUser).flatMap(([key, value]) => (key === 'id' ? [] : [[`${CURRENT_USER_PREFIX}${key}`, value]]))) : {};
    const wasOwnershipAnswered = corpay?.[ANY_INDIVIDUAL_OWN_25_PERCENT_OR_MORE] !== undefined;
    return {
        ...userAnswers,
        [OWNS_MORE_THAN_25_PERCENT]: corpay?.[OWNS_MORE_THAN_25_PERCENT],
        [ANY_INDIVIDUAL_OWN_25_PERCENT_OR_MORE]: wasOwnershipAnswered ? otherOwners.length > 0 : undefined,
        [OWNER_LIST_KEY]: otherOwners.length > 0 ? otherOwners : undefined,
    };
}

export default getBeneficialOwnerInfoForm;
export {getBeneficialOwnerInfoParams, getBeneficialOwnerInfoPrefill, getOwnershipTotalErrors};
