import {parseContent} from '@components/DynamicForm/content/content';
import {getPages, getPageTitle, getPageSectionName, isPageShown, getStartPageIndex} from '@components/DynamicForm/flow/pages';
import type {DynamicFormFlowPage} from '@components/DynamicForm/flow/types';

import CONST from '@src/CONST';
import IntlStore from '@src/languages/IntlStore';
import type {DynamicFormExpensifyInputElement, DynamicFormField, DynamicFormPage, DynamicFormSchemaElement, DynamicFormTextField} from '@src/types/onyx';

import {translateLocal} from '../../../../utils/TestHelper';

function text(key: string, extra: Partial<DynamicFormTextField> = {}): DynamicFormTextField & DynamicFormExpensifyInputElement {
    return {elementType: 'ExpensifyInput', key, type: 'text', required: true, label: key, ...extra};
}

function input(field: DynamicFormField): DynamicFormExpensifyInputElement {
    return {...field, elementType: 'ExpensifyInput'};
}

function keysOf(pages: DynamicFormFlowPage[]): Array<Array<string | undefined>> {
    return pages.map((page) => page.content.elements.map((item) => item.key));
}

describe('getPages', () => {
    it('leaves out fields of an unknown type', () => {
        // Given a flat schema with a field of a type this App version does not know
        const unknown = {elementType: 'ExpensifyInput', key: 'x', type: 'hologram', required: true};

        // When its pages are built
        const pages = getPages({elements: [unknown, text('a')]});

        // Then the unknown field is parsed out before paginating, so it does not produce an empty page
        expect(keysOf(pages)).toEqual([['a']]);
    });

    it('names pages built from elements page-N', () => {
        // Given a flat schema
        const elements: DynamicFormSchemaElement[] = [text('a'), input({key: 'address', type: 'address', required: true})];

        // When its pages are built
        const pages = getPages({elements});

        // Then the pages get stable keys
        expect(pages.map((page) => page.key)).toEqual(['page-1', 'page-2']);
    });

    it('turns keys into URL-safe slugs, reserves confirm and makes keys unique', () => {
        // Given pages whose keys are not URL-safe, collide, or take the confirmation route
        const content = [text('a')];
        const schemaPages: DynamicFormPage[] = [
            {key: 'Bank Info', content},
            {key: 'bank-info', content},
            {key: 'confirm', content},
            {key: '###', content},
        ];

        // When the schema's pages are read
        const pages = getPages({pages: schemaPages});

        // Then each is a unique route segment
        expect(pages.map((page) => page.key)).toEqual(['bank-info', 'bank-info-2', 'confirm-2', 'page-4']);
    });
});

describe('getPageTitle', () => {
    it('prefers the page title, translated when it has a key', () => {
        // Given a page with a titleKey
        const page: DynamicFormFlowPage = {key: 'p', titleKey: 'common.next', content: parseContent([text('a')])};

        // When its title is read
        const title = getPageTitle(page, {}, translateLocal);

        // Then the translation is used
        expect(title).toBe(translateLocal('common.next'));
    });

    it('falls back to the label of the lone question, ignoring a field it reveals', () => {
        // Given an untitled page with one question and a field it reveals
        const page: DynamicFormFlowPage = {key: 'p', content: parseContent([text('a', {label: 'Alpha'}), text('b', {label: 'Beta', showWhen: {key: 'a', equals: ['x']}})])};

        // When the revealed field shows
        const title = getPageTitle(page, {a: 'x'}, translateLocal);

        // Then the title is still the question's label
        expect(title).toBe('Alpha');
    });

    it("prefers the lone question's wording over its label", () => {
        // Given an untitled page whose only question has its wording as a question
        const page: DynamicFormFlowPage = {key: 'p', content: parseContent([text('a', {label: 'Account number', question: "What's your account number?"})])};

        // When its title is read
        const title = getPageTitle(page, {}, translateLocal);

        // Then the headline asks the question, so it does not repeat the input's label
        expect(title).toBe("What's your account number?");
    });

    it('has no title when there are several questions', () => {
        // Given an untitled page with several visible questions
        const page: DynamicFormFlowPage = {
            key: 'p',
            content: parseContent([text('a', {label: 'Alpha', showWhen: {key: 'z', equals: ['1']}}), text('b', {label: 'Beta'}), text('c', {label: 'Gamma'})]),
        };

        // When its title is read
        const title = getPageTitle(page, {}, translateLocal);

        // Then it is blank, since no one question names the page
        expect(title).toBe('');
    });
});

describe('getPageSectionName', () => {
    it('uses the page title', () => {
        // Given a titled page
        const page: DynamicFormFlowPage = {key: 'p', title: 'Bank details', content: parseContent([text('a', {label: 'Alpha'})])};

        // When its section name is read
        const name = getPageSectionName(page, {}, translateLocal);

        // Then it is the page title
        expect(name).toBe('Bank details');
    });

    it("uses the lone question's wording on an untitled page", () => {
        // Given an untitled page whose only question has its wording
        const page: DynamicFormFlowPage = {key: 'p', content: parseContent([text('a', {label: 'Account number', question: "What's your account number?"})])};

        // When its section name is read
        const name = getPageSectionName(page, {}, translateLocal);

        // Then it is that wording
        expect(name).toBe("What's your account number?");
    });

    it('never uses a label', () => {
        // Given untitled pages with one question and with several, none with its wording
        const lonePage: DynamicFormFlowPage = {key: 'p', content: parseContent([text('a', {label: 'Account number'})])};
        const sharedPage: DynamicFormFlowPage = {key: 'q', content: parseContent([text('a', {label: 'Account number'}), text('b', {label: 'Settlement currency'})])};

        // When their section names are read
        const names = [getPageSectionName(lonePage, {}, translateLocal), getPageSectionName(sharedPage, {}, translateLocal)];

        // Then both are blank, since the label is already on the row below and would only name one of several rows
        expect(names).toEqual(['', '']);
    });
});

describe('isPageShown', () => {
    it('hides a page whose own showWhen does not match, using a field of another page', () => {
        // Given a page shown only for business, controlled from another page
        const pages = getPages({
            pages: [
                {key: 'first', content: [text('type')]},
                {key: 'biz', showWhen: {key: 'type', equals: ['BUSINESS']}, content: [text('ein')]},
            ],
        });

        // When the user answers private, and then business
        const shownForPrivate = pages.filter((page) => isPageShown(page, {type: 'PRIVATE'})).map((page) => page.key);
        const shownForBusiness = pages.filter((page) => isPageShown(page, {type: 'BUSINESS'})).map((page) => page.key);

        // Then the business page follows the answer
        expect(shownForPrivate).toEqual(['first']);
        expect(shownForBusiness).toEqual(['first', 'biz']);
    });

    it('hides a page with no visible field', () => {
        // Given a page whose only field is hidden
        const page: DynamicFormFlowPage = {key: 'p', content: parseContent([text('a', {showWhen: {key: 'z', equals: ['1']}})])};

        // When the flow checks whether to show it
        const isShown = isPageShown(page, {});

        // Then the page is skipped
        expect(isShown).toBe(false);
    });
});

const startPages = getPages({
    pages: [
        {key: 'name', content: [{elementType: 'ExpensifyInput', key: 'name', type: 'text', required: true}]},
        {key: 'consent', content: [{elementType: 'ExpensifyInput', key: 'consent', type: 'boolean', required: false}]},
        {key: 'city', content: [{elementType: 'HTMLInput', key: 'city', name: 'City', type: 'text', required: true}]},
    ],
});
const startOptions = {pages: startPages, isDraftLoading: false, firstShownPageIndex: 0, lastShownPageIndex: 3, translate: translateLocal};

describe('getStartPageIndex', () => {
    beforeAll(() => {
        IntlStore.load(CONST.LOCALES.DEFAULT);
    });

    it('waits while the draft loads', () => {
        // Given a draft that has not loaded yet
        // When the flow picks where the visit starts
        const startFrom = getStartPageIndex({...startOptions, draftValues: {}, isDraftLoading: true});

        // Then useSubPage is told to wait
        expect(startFrom).toBe(-1);
    });

    it('starts a new form on its first shown page', () => {
        // Given an empty draft
        // When the flow picks where the visit starts
        const startFrom = getStartPageIndex({...startOptions, draftValues: {}});

        // Then the visit starts from the beginning
        expect(startFrom).toBe(0);
    });

    it('resumes at the first page with a gap', () => {
        // Given a draft that answers the first page only
        // When the flow picks where the visit starts
        const startFrom = getStartPageIndex({...startOptions, draftValues: {name: 'Ada'}});

        // Then the visit resumes at the HTML input still unanswered, since the optional checkbox has no gap
        expect(startFrom).toBe(2);
    });

    it('counts a No as progress', () => {
        // Given a form that opens with an optional checkbox, and a draft whose only answer is that checkbox left clear
        const consentFirstPages = startPages.slice(1);
        const consentFirstStartOptions = {...startOptions, pages: consentFirstPages};

        // When the flow picks where the visit starts
        const startFrom = getStartPageIndex({...consentFirstStartOptions, draftValues: {consent: false}});

        // Then the visit resumes at the city page, the first gap, instead of starting over on the checkbox
        expect(startFrom).toBe(1);
    });

    it('opens the last page of a complete draft', () => {
        // Given a draft that answers every page
        // When the flow picks where the visit starts
        const startFrom = getStartPageIndex({...startOptions, draftValues: {name: 'Ada', city: 'London'}});

        // Then the visit opens the last shown page, which is the confirmation page
        expect(startFrom).toBe(3);
    });
});
