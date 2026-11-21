import getStepInputIDsToClear from '@pages/SimplifiedBankOnboarding/flow/getStepInputIDsToClear';
import createDateOfBirthField from '@pages/SimplifiedBankOnboarding/form/fields/createDateOfBirthField';
import createFileField from '@pages/SimplifiedBankOnboarding/form/fields/createFileField';
import createLegalNameField from '@pages/SimplifiedBankOnboarding/form/fields/createLegalNameField';
import type {StepConfig} from '@pages/SimplifiedBankOnboarding/formConfig/types';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/SBO_CONST';

const {PAGE_NAMES, KYB_DOCUMENTS_SUB_PAGES, BENEFICIAL_OWNERS_SUB_PAGES, PERSONAL_INFO_SUB_PAGES} = SBO_CONST.USD;

describe('getStepInputIDsToClear', () => {
    it('lists the inputs of the form and question pages of the step', () => {
        // Given a step with a form page, a question page and a confirmation page
        const step: StepConfig = {
            id: PAGE_NAMES.BENEFICIAL_OWNERS,
            title: 'Owners',
            isComplete: true,
            pages: [
                {
                    kind: 'question',
                    id: BENEFICIAL_OWNERS_SUB_PAGES.IS_USER_UBO,
                    fieldID: 'ownsMoreThan25Percent',
                    title: '',
                    description: '',
                    defaultValue: false,
                    isComplete: true,
                },
                {
                    kind: 'form',
                    id: BENEFICIAL_OWNERS_SUB_PAGES.LEGAL_NAME,
                    title: '',
                    isComplete: true,
                    fields: [createLegalNameField('ownerFirstName', 'ownerLastName')],
                },
                {
                    kind: 'confirmation',
                    id: BENEFICIAL_OWNERS_SUB_PAGES.CONFIRMATION,
                    title: '',
                    isComplete: true,
                },
            ],
        };

        // When the inputs to clear after the step request are listed
        const inputIDs = getStepInputIDsToClear(step);

        // Then they are the question answer and the typed values, so the server values show after the step is saved
        expect(inputIDs).toEqual(['ownsMoreThan25Percent', 'ownerFirstName', 'ownerLastName']);
    });

    it('keeps files out of the list', () => {
        // Given a step whose page has a file field and a date field
        const step: StepConfig = {
            id: PAGE_NAMES.KYB_DOCS,
            title: 'Documents',
            isComplete: true,
            pages: [
                {
                    kind: 'form',
                    id: KYB_DOCUMENTS_SUB_PAGES.UPLOAD,
                    title: '',
                    isComplete: true,
                    fields: [createFileField('companyTaxIDDocument', {label: ''}), createDateOfBirthField('dob')],
                },
            ],
        };

        // When the inputs to clear are listed
        const inputIDs = getStepInputIDsToClear(step);

        // Then only the date is listed, because the server never sends files back and clearing them would lose the upload
        expect(inputIDs).toEqual(['dob']);
    });

    it('lists nothing for a step of custom pages', () => {
        // Given a step whose only page is a custom screen
        const step: StepConfig = {
            id: PAGE_NAMES.REQUESTOR,
            title: 'Identity',
            isComplete: true,
            pages: [
                {
                    kind: 'custom',
                    id: PERSONAL_INFO_SUB_PAGES.CONFIRMATION,
                    component: 'onfido',
                    isComplete: true,
                },
            ],
        };

        // When the inputs to clear are listed
        // Then there are none, because the custom screen keeps no form input
        expect(getStepInputIDsToClear(step)).toEqual([]);
    });
});
