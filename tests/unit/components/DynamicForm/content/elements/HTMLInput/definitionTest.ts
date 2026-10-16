import htmlInputDefinition from '@components/DynamicForm/content/elements/HTMLInput/definition';

import CONST from '@src/CONST';
import IntlStore from '@src/languages/IntlStore';
import type {DynamicFormHTMLInputElement} from '@src/types/onyx';

import {translateLocal} from '../../../../../../utils/TestHelper';

const sortCode: DynamicFormHTMLInputElement = {
    elementType: 'HTMLInput',
    key: 'sortCode',
    name: 'UK sort code',
    type: 'text',
    required: true,
    example: '040075',
    minLength: 6,
    maxLength: 8,
    validationRegexp: '^[0-9]{2}-?[0-9]{2}-?[0-9]{2}$',
};

const legalType: DynamicFormHTMLInputElement = {
    elementType: 'HTMLInput',
    key: 'legalType',
    name: 'Recipient type',
    type: 'radio',
    required: true,
    valuesAllowed: [
        {key: 'PRIVATE', name: 'Person'},
        {key: 'BUSINESS', name: 'Business'},
    ],
};

describe('htmlInputDefinition.getErrors', () => {
    beforeAll(() => {
        IntlStore.load(CONST.LOCALES.DEFAULT);
    });

    it('accepts answers that pass every rule Wise sends', () => {
        // Given a sort code with a regex and lengths, and a radio with allowed values
        // When both are answered within the rules
        const values = {sortCode: '04-00-75', legalType: 'BUSINESS'};
        const errors = [sortCode, legalType].flatMap((input) => htmlInputDefinition.getErrors(input, values, translateLocal));

        // Then there are no errors
        expect(errors).toEqual([]);
    });

    it('flags a missing required answer and skips an empty optional one', () => {
        // Given a blank required sort code and a blank optional e-mail
        const email: DynamicFormHTMLInputElement = {elementType: 'HTMLInput', key: 'email', name: 'E-mail', type: 'text', required: false, validationRegexp: '^.+@.+$'};

        // When they are checked
        const values = {sortCode: '', email: ''};
        const errors = [sortCode, email].flatMap((input) => htmlInputDefinition.getErrors(input, values, translateLocal));

        // Then only the required one is flagged, since the regex applies to an answer only
        expect(errors).toEqual([['sortCode', translateLocal('common.error.fieldRequired')]]);
    });

    it('flags a typed answer that breaks the regex and the minimum length, showing the example', () => {
        // Given a sort code
        // When it is answered with too few letters
        const errors = htmlInputDefinition.getErrors(sortCode, {sortCode: 'AB'}, translateLocal);

        // Then both rules are reported, like Wise reports them, with the example to follow
        expect(errors).toEqual([
            ['sortCode', translateLocal('dynamicForm.error.invalidFormat', {example: '040075'})],
            ['sortCode', translateLocal('dynamicForm.error.tooShort', {minLength: 6})],
        ]);
    });

    it('flags a choice that is not among the allowed values', () => {
        // Given a radio and a draft holding a value Wise no longer allows
        // When it is checked
        const errors = htmlInputDefinition.getErrors(legalType, {legalType: 'TRUST'}, translateLocal);

        // Then the stale choice must be picked again
        expect(errors).toEqual([['legalType', translateLocal('dynamicForm.error.invalidOption')]]);
    });

    it('flags a date that does not parse', () => {
        // Given a date of birth
        const dateOfBirth: DynamicFormHTMLInputElement = {elementType: 'HTMLInput', key: 'dateOfBirth', name: 'Date of birth', type: 'date', required: true};

        // When it is answered with text that is not a date
        const errors = htmlInputDefinition.getErrors(dateOfBirth, {dateOfBirth: 'yesterday'}, translateLocal);

        // Then the date is flagged
        expect(errors).toEqual([['dateOfBirth', translateLocal('common.error.dateInvalid')]]);
    });
});

describe('htmlInputDefinition sensitivity', () => {
    const handlers = {onEdit: jest.fn(), onEditListItem: jest.fn()};

    it('keeps an answer out of the draft and masks it unless the schema opts out', () => {
        // Given a sort code that does not set `sensitive`, and a recipient type that sets it to false
        const recipientType: DynamicFormHTMLInputElement = {...legalType, sensitive: false};
        const values = {sortCode: '040075', legalType: 'PRIVATE'};

        // When their memory keys and confirmation rows are read
        const sensitiveKeys = [sortCode, recipientType].flatMap((input) => htmlInputDefinition.getSensitiveKeys(input));
        const rows = [sortCode, recipientType].flatMap((input) => htmlInputDefinition.getConfirmationRows(input, values, translateLocal, handlers));

        // Then only the sort code stays in memory and is masked, since Wise asks for bank details and a field has to opt out to be drafted
        expect(sensitiveKeys).toEqual(['sortCode']);
        expect(rows.map((row) => row.title)).toEqual(['•••075', 'Person']);
    });
});
