import parseContent from '@components/DynamicForm/content/parseContent';

import Log from '@libs/Log';

import type {DynamicFormExpensifyInputElement, DynamicFormField} from '@src/types/onyx';

const email: DynamicFormExpensifyInputElement = {elementType: 'ExpensifyInput', key: 'email', type: 'text', required: true};

describe('parseContent', () => {
    const warnSpy = jest.spyOn(Log, 'warn').mockImplementation(() => {});

    beforeEach(() => {
        warnSpy.mockClear();
    });

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

    it('leaves out entry fields of an unknown type or without a key, at any depth', () => {
        // Given a list of owners whose entries hold a field of a type this App version does not know, a keyless address, and a nested list with another unknown field
        const firstName: DynamicFormField = {key: 'firstName', type: 'text', required: true};
        const signature = {key: 'signature', type: 'signature', required: true};
        const keylessAddress = {key: '', type: 'address', required: true};
        const documents = {
            key: 'documents',
            type: 'list',
            required: false,
            itemFields: [
                {key: 'documentNumber', type: 'text', required: true},
                {key: 'scan', type: 'hologram', required: true},
            ],
        };
        const owners = {elementType: 'ExpensifyInput', key: 'owners', type: 'list', required: true, itemFields: [firstName, signature, keylessAddress, documents]};

        // When the content is parsed twice, as on every render
        parseContent([owners]);
        const elements = parseContent([owners]);

        // Then the entries keep only fields the renderers and validators know, so an entry editor never meets an unknown type, and each problem is logged once
        expect(elements).toEqual([{...owners, itemFields: [firstName, {...documents, itemFields: [{key: 'documentNumber', type: 'text', required: true}]}]}]);
        expect(warnSpy).toHaveBeenCalledTimes(3);
        expect(warnSpy).toHaveBeenCalledWith('[DynamicForm] Unknown field type', {type: 'signature', key: 'signature'});
        expect(warnSpy).toHaveBeenCalledWith('[DynamicForm] Field without a key', {type: 'address'});
        expect(warnSpy).toHaveBeenCalledWith('[DynamicForm] Unknown field type', {type: 'hologram', key: 'scan'});
    });
});
