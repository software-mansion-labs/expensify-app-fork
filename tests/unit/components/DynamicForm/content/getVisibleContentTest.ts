import getVisibleContent from '@components/DynamicForm/content/getVisibleContent';

import type {DynamicFormBannerElement, DynamicFormDescriptionElement, DynamicFormExpensifyInputElement, DynamicFormHeadingElement, DynamicFormHTMLInputElement} from '@src/types/onyx';

const email: DynamicFormExpensifyInputElement = {elementType: 'ExpensifyInput', key: 'email', type: 'text', required: true};

describe('getVisibleContent', () => {
    it('keeps a heading when the heading after it is hidden by its own condition', () => {
        // Given a heading, then a heading shown only for business recipients, then a field
        const details: DynamicFormHeadingElement = {elementType: 'Heading', key: 'details', title: 'Details'};
        const business: DynamicFormHeadingElement = {elementType: 'Heading', key: 'business', title: 'Business', showWhen: {key: 'legalType', equals: ['BUSINESS']}};

        // When the content is checked for a private recipient
        const visibleContent = getVisibleContent([details, business, email], {legalType: 'PRIVATE'});

        // Then the first heading titles the field, since a hidden heading is skipped and does not end the block above it
        expect(visibleContent).toEqual([details, email]);
    });

    it('drops the first of two shown headings in a row', () => {
        // Given two headings with no field between them
        const details: DynamicFormHeadingElement = {elementType: 'Heading', key: 'details', title: 'Details'};
        const contact: DynamicFormHeadingElement = {elementType: 'Heading', key: 'contact', title: 'Contact'};

        // When the content is checked
        const visibleContent = getVisibleContent([details, contact, email], {});

        // Then only the heading right above the field is kept, since the first one titles nothing
        expect(visibleContent).toEqual([contact, email]);
    });

    it('drops a heading with no text', () => {
        // Given a heading with neither a title nor a description, which would draw an empty gap
        const empty: DynamicFormHeadingElement = {elementType: 'Heading', key: 'empty'};

        // When the content is checked
        const visibleContent = getVisibleContent([empty, email], {});

        // Then only the field is left
        expect(visibleContent).toEqual([email]);
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
        const visibleContent = getVisibleContent([companyNumber], {legalType: 'PRIVATE', companyName: 'Acme'}, [companyName, companyNumber]);

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
        const visibleContent = getVisibleContent([intro, companyName, warning], {legalType: 'PRIVATE'});

        // Then the display elements stay, since only inputs and headings can be hidden
        expect(visibleContent).toEqual([intro, warning]);
    });

    it('keeps a heading above an HTML input', () => {
        // Given a heading followed only by a Wise input
        const bank: DynamicFormHeadingElement = {elementType: 'Heading', key: 'bank', title: 'Bank details'};
        const sortCode: DynamicFormHTMLInputElement = {elementType: 'HTMLInput', key: 'sortCode', name: 'UK sort code', type: 'text', required: true};

        // When the content is checked
        const visibleContent = getVisibleContent([bank, sortCode], {});

        // Then the heading titles the input, since an HTML input is a question too
        expect(visibleContent).toEqual([bank, sortCode]);
    });

    it('leaves out an element type this App version does not know', () => {
        // Given an element of an unknown type before a field
        const carousel = {elementType: 'Carousel', key: 'carousel'};

        // When the content is checked
        const visibleContent = getVisibleContent([carousel, email], {});

        // Then only the field is left, so an older App ignores newer elements
        expect(visibleContent).toEqual([email]);
    });
});
