import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import createDateOfBirthField from '@pages/SimplifiedBankOnboarding/core/form/fields/createDateOfBirthField';
import createFileField from '@pages/SimplifiedBankOnboarding/core/form/fields/createFileField';
import createLegalNameField from '@pages/SimplifiedBankOnboarding/core/form/fields/createLegalNameField';
import createYesNoField from '@pages/SimplifiedBankOnboarding/core/form/fields/createYesNoField';
import getStepInputIDsToClear from '@pages/SimplifiedBankOnboarding/core/plan/getStepInputIDsToClear';
import type {StepConfig} from '@pages/SimplifiedBankOnboarding/core/plan/types';

const {PAGE_NAMES, KYB_DOCUMENTS_SUB_PAGES, BENEFICIAL_OWNERS_SUB_PAGES, PERSONAL_INFO_SUB_PAGES} = SBO_CONST.USD;

describe('getStepInputIDsToClear', () => {
    it('lists the inputs of the form pages of the step', () => {
        // Given a step with a question, a form page with typed inputs and a confirmation page
        const step: StepConfig = {
            id: PAGE_NAMES.BENEFICIAL_OWNERS,
            title: 'Owners',
            isComplete: true,
            pages: [
                {
                    kind: 'form',
                    id: BENEFICIAL_OWNERS_SUB_PAGES.IS_USER_UBO,
                    title: '',
                    isComplete: true,
                    fields: [createYesNoField('ownsMoreThan25Percent', {question: ''})],
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
                    isComplete: true,
                    render: () => null,
                },
            ],
        };

        // When the inputs to clear are listed
        // Then there are none, because the custom screen keeps no form input
        expect(getStepInputIDsToClear(step)).toEqual([]);
    });
});
