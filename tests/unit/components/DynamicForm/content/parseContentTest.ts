import parseContent from '@components/DynamicForm/content/parseContent';

import type {DynamicFormExpensifyInputElement} from '@src/types/onyx';

const email: DynamicFormExpensifyInputElement = {elementType: 'ExpensifyInput', key: 'email', type: 'text', required: true};

describe('parseContent', () => {
    it('leaves out an element type this App version does not know', () => {
        // Given an element of an unknown type before a field
        const carousel = {elementType: 'Carousel', key: 'carousel'};

        // When the content is parsed
        const elements = parseContent([carousel, email]);

        // Then only the field is left, so an older App ignores newer elements
        expect(elements).toEqual([email]);
    });

    it('leaves out a known element the schema sent malformed or without a key', () => {
        // Given a banner with no text, a Wise input of an unknown input type, a field of an unknown field type, and a heading with no key
        const emptyBanner = {elementType: 'Banner', key: 'empty', text: ''};
        const unknownInputType = {elementType: 'HTMLInput', key: 'iban', name: 'IBAN', type: 'hologram', required: true};
        const unknownFieldType = {elementType: 'ExpensifyInput', key: 'x', type: 'hologram', required: true};
        const keylessHeading = {elementType: 'Heading', key: '', title: 'Details'};

        // When the content is parsed
        const elements = parseContent([emptyBanner, unknownInputType, unknownFieldType, keylessHeading, email]);

        // Then only the well-formed field is left, so nothing after parsing has to check the schema again
        expect(elements).toEqual([email]);
    });

    it('leaves out a heading with no text', () => {
        // Given a heading with neither a title nor a description, which would draw an empty gap
        const emptyHeading = {elementType: 'Heading', key: 'empty'};

        // When the content is parsed
        const elements = parseContent([emptyHeading, email]);

        // Then only the field is left
        expect(elements).toEqual([email]);
    });
});
