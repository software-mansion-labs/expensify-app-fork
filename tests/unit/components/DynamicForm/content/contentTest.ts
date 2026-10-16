import {parseContent, getVisibleContent, getContentAnswers, paginateContent} from '@components/DynamicForm/content/content';
import type {ParsedContent} from '@components/DynamicForm/content/content';

import Log from '@libs/Log';

import type {
    DynamicFormExpensifyInputElement,
    DynamicFormField,
    DynamicFormBannerElement,
    DynamicFormDescriptionElement,
    DynamicFormHeadingElement,
    DynamicFormHTMLInputElement,
    DynamicFormElement,
    DynamicFormTextField,
} from '@src/types/onyx';

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
        const {elements} = parseContent([carousel, email]);

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
        const {elements} = parseContent([emptyBanner, unknownInputType, unknownFieldType, keylessHeading, email]);

        // Then only the well-formed field is left, so nothing after parsing has to check the schema again
        expect(elements).toEqual([email]);
    });

    it('leaves out a heading with no text', () => {
        // Given a heading with neither a title nor a description, which would draw an empty gap
        const emptyHeading = {elementType: 'Heading', key: 'empty'};

        // When the content is parsed
        const {elements} = parseContent([emptyHeading, email]);

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
        const {elements} = parseContent([owners]);

        // Then the entries keep only fields the renderers and validators know, so an entry editor never meets an unknown type, and each problem is logged once
        expect(elements).toEqual([{...owners, itemFields: [firstName, {...documents, itemFields: [{key: 'documentNumber', type: 'text', required: true}]}]}]);
        expect(warnSpy).toHaveBeenCalledTimes(3);
        expect(warnSpy).toHaveBeenCalledWith('[DynamicForm] Unknown field type', {type: 'signature', key: 'signature'});
        expect(warnSpy).toHaveBeenCalledWith('[DynamicForm] Field without a key', {type: 'address'});
        expect(warnSpy).toHaveBeenCalledWith('[DynamicForm] Unknown field type', {type: 'hologram', key: 'scan'});
    });
});

describe('getVisibleContent', () => {
    it('keeps a heading when the heading after it is hidden by its own condition', () => {
        // Given a heading, then a heading shown only for business recipients, then a field
        const details: DynamicFormHeadingElement = {elementType: 'Heading', key: 'details', title: 'Details'};
        const business: DynamicFormHeadingElement = {elementType: 'Heading', key: 'business', title: 'Business', showWhen: {key: 'legalType', equals: ['BUSINESS']}};

        // When the content is checked for a private recipient
        const visibleContent = getVisibleContent(parseContent([details, business, email]), {legalType: 'PRIVATE'});

        // Then the first heading titles the field, since a hidden heading is skipped and does not end the block above it
        expect(visibleContent).toEqual([details, email]);
    });

    it('drops the first of two shown headings in a row', () => {
        // Given two headings with no field between them
        const details: DynamicFormHeadingElement = {elementType: 'Heading', key: 'details', title: 'Details'};
        const contact: DynamicFormHeadingElement = {elementType: 'Heading', key: 'contact', title: 'Contact'};

        // When the content is checked
        const visibleContent = getVisibleContent(parseContent([details, contact, email]), {});

        // Then only the heading right above the field is kept, since the first one titles nothing
        expect(visibleContent).toEqual([contact, email]);
    });

    it('hides a field whose controlling field on another page is hidden', () => {
        // Given a page with a field controlled by companyName, which sits on another page and is shown only for business recipients
        const companyName: DynamicFormExpensifyInputElement = {
            elementType: 'ExpensifyInput',
            key: 'companyName',
            type: 'text',
            required: true,
            showWhen: {key: 'legalType', equals: ['BUSINESS']},
        };
        const companyNumber: DynamicFormExpensifyInputElement = {
            elementType: 'ExpensifyInput',
            key: 'companyNumber',
            type: 'text',
            required: true,
            showWhen: {key: 'companyName', equals: ['Acme']},
        };

        // When the page is checked with the whole form, and companyName keeps an answer from before the user switched to a private recipient
        const visibleContent = getVisibleContent({elements: [companyNumber], fields: [companyName, companyNumber]}, {legalType: 'PRIVATE', companyName: 'Acme'});

        // Then companyNumber stays hidden, because the question it depends on is hidden
        expect(visibleContent).toEqual([]);
    });

    it('keeps banners and descriptions, which follow no condition', () => {
        // Given a description and a banner around a field hidden for private recipients
        const intro: DynamicFormDescriptionElement = {elementType: 'Description', key: 'intro', text: 'Enter the recipient details.'};
        const warning: DynamicFormBannerElement = {elementType: 'Banner', key: 'warning', text: 'Check the name.'};
        const companyName: DynamicFormExpensifyInputElement = {
            elementType: 'ExpensifyInput',
            key: 'companyName',
            type: 'text',
            required: true,
            showWhen: {key: 'legalType', equals: ['BUSINESS']},
        };

        // When the content is checked for a private recipient
        const visibleContent = getVisibleContent(parseContent([intro, companyName, warning]), {legalType: 'PRIVATE'});

        // Then the display elements stay, since only inputs and headings can be hidden
        expect(visibleContent).toEqual([intro, warning]);
    });

    it('keeps a heading above an HTML input', () => {
        // Given a heading followed only by a Wise input
        const bank: DynamicFormHeadingElement = {elementType: 'Heading', key: 'bank', title: 'Bank details'};
        const sortCode: DynamicFormHTMLInputElement = {elementType: 'HTMLInput', key: 'sortCode', name: 'UK sort code', type: 'text', required: true};

        // When the content is checked
        const visibleContent = getVisibleContent(parseContent([bank, sortCode]), {});

        // Then the heading titles the input, since an HTML input is a question too
        expect(visibleContent).toEqual([bank, sortCode]);
    });
});

describe('getContentAnswers', () => {
    it('submits Wise answers next to the visible App answers and nothing for display elements', () => {
        // Given a page with a Wise input, a banner, and an App field shown only for business recipients
        const content: DynamicFormElement[] = [
            {elementType: 'HTMLInput', key: 'accountNumber', name: 'Account number', type: 'text', required: true},
            {elementType: 'Banner', key: 'warning', text: 'Check the number.'},
            {elementType: 'ExpensifyInput', key: 'companyName', type: 'text', required: true, showWhen: {key: 'legalType', equals: ['BUSINESS']}},
        ];

        // When the answers of a private recipient, with a stale company name, are collected
        const answers = getContentAnswers(parseContent(content), {accountNumber: '37778842', companyName: 'Acme', legalType: 'PRIVATE', warning: 'x'});

        // Then the Wise answer is kept under its key and the hidden App field and the banner add nothing
        expect(answers).toEqual({accountNumber: '37778842'});
    });

    it('leaves out a Wise input the user never answered', () => {
        // Given a page with an optional Wise input
        const content: DynamicFormElement[] = [{elementType: 'HTMLInput', key: 'email', name: 'E-mail', type: 'text', required: false}];

        // When nothing was answered
        const answers = getContentAnswers(parseContent(content), {});

        // Then the submission has no key for it, so the backend does not get an empty value
        expect(answers).toEqual({});
    });
});

function text(key: string, extra: Partial<DynamicFormTextField> = {}): DynamicFormTextField & DynamicFormExpensifyInputElement {
    return {elementType: 'ExpensifyInput', key, type: 'text', required: true, label: key, ...extra};
}

function input(field: DynamicFormField): DynamicFormExpensifyInputElement {
    return {...field, elementType: 'ExpensifyInput'};
}

function options(count: number) {
    return Array.from({length: count}, (_, index) => ({key: `o${index}`, label: `o${index}`}));
}

function keysOf(pages: ParsedContent[]): Array<Array<string | undefined>> {
    return pages.map((page) => page.elements.map((item) => item.key));
}

describe('paginateContent', () => {
    it('puts each own-page type on a page of its own', () => {
        // Given one field of every type that needs room
        const fields: DynamicFormField[] = [
            {key: 'address', type: 'address', required: true},
            {key: 'file', type: 'file', required: true},
            {key: 'multi', type: 'multiselect', required: true, values: options(2)},
            {key: 'countries', type: 'countryMultiselect', required: true},
            {key: 'dependent', type: 'select', required: true, dependsOn: {key: 'country', valuesBy: {}}},
        ];

        // When the fields are paginated
        const pages = paginateContent(parseContent(fields.map(input)));

        // Then none of them shares a page, since each needs the whole screen
        expect(keysOf(pages)).toEqual([['address'], ['file'], ['multi'], ['countries'], ['dependent']]);
    });

    it('keeps a small select with the other short questions but moves a large one out', () => {
        // Given a small select and a select with more options than the threshold
        const small = input({key: 'small', type: 'select', required: true, values: options(3)});
        const large = input({key: 'large', type: 'select', required: true, values: options(11)});

        // When they are paginated between two text fields
        const pages = paginateContent(parseContent([text('a'), small, large, text('b')]));

        // Then the large select, which opens a searchable list, is alone and breaks the run
        expect(keysOf(pages)).toEqual([['a', 'small'], ['large'], ['b']]);
    });

    it('starts a new page after four questions in a row', () => {
        // Given five short questions
        const fields = [text('a'), text('b'), text('c'), text('d'), text('e')];

        // When they are split into pages
        const pages = paginateContent(parseContent(fields));

        // Then the fifth does not fit the shared page
        expect(keysOf(pages)).toEqual([['a', 'b', 'c', 'd'], ['e']]);
    });

    it('keeps a field revealed by its controller on the controller page without counting it', () => {
        // Given four questions where the second reveals a fifth field
        const revealed = text('other', {showWhen: {key: 'b', equals: ['x']}});

        // When they are paginated
        const pages = paginateContent(parseContent([text('a'), text('b'), revealed, text('c'), text('d')]));

        // Then all of them stay on one page, since the revealed field is not a question of its own
        expect(keysOf(pages)).toEqual([['a', 'b', 'other', 'c', 'd']]);
    });

    it('keeps the fields an own-page controller reveals with it', () => {
        // Given an own-page select that reveals a text field
        const select = input({key: 'dep', type: 'select', required: true, dependsOn: {key: 'x', valuesBy: {}}});

        // When paginated with a field after the revealed one
        const pages = paginateContent(parseContent([select, text('why', {showWhen: {key: 'dep', equals: ['y']}}), text('z')]));

        // Then the revealed field follows its controller and the next question starts a new page
        expect(keysOf(pages)).toEqual([['dep', 'why'], ['z']]);
    });

    it('puts banners and descriptions on the page of the input after them', () => {
        // Given a description before a text field and a banner before an own-page address
        const intro: DynamicFormElement = {elementType: 'Description', key: 'intro', text: 'Who are you paying?'};
        const warning: DynamicFormElement = {elementType: 'Banner', key: 'warning', text: 'Use a home address.'};

        // When they are paginated
        const pages = paginateContent(parseContent([intro, text('a'), warning, input({key: 'address', type: 'address', required: true})]));

        // Then each display element sits above the input it introduces, even when that input needs its own page
        expect(keysOf(pages)).toEqual([
            ['intro', 'a'],
            ['warning', 'address'],
        ]);
    });

    it('counts HTML inputs as questions and keeps a trailing banner on the last page', () => {
        // Given five Wise inputs followed by a banner
        const wise = ['a', 'b', 'c', 'd', 'e'].map((key): DynamicFormHTMLInputElement => ({elementType: 'HTMLInput', key, name: key, type: 'text', required: true}));
        const note: DynamicFormElement = {elementType: 'Banner', key: 'note', text: 'Checked by the bank.'};

        // When they are paginated
        const pages = paginateContent(parseContent([...wise, note]));

        // Then they split like App fields and the banner does not get a page of its own
        expect(keysOf(pages)).toEqual([
            ['a', 'b', 'c', 'd'],
            ['e', 'note'],
        ]);
    });
});
