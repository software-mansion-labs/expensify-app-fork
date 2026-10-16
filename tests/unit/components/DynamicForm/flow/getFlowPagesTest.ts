import getFlowPages from '@components/DynamicForm/flow/getFlowPages';
import {getAllFields} from '@components/DynamicForm/flow/pages/getPages';
import type {DynamicFormFlowPage} from '@components/DynamicForm/flow/types';

import CONST from '@src/CONST';

const pages: DynamicFormFlowPage[] = [
    {key: 'type', content: [{elementType: 'ExpensifyInput', key: 'type', type: 'radio', required: true, values: [{key: 'PRIVATE'}, {key: 'BUSINESS'}]}]},
    {key: 'business', showWhen: {key: 'type', equals: ['BUSINESS']}, content: [{elementType: 'ExpensifyInput', key: 'ein', type: 'text', required: true}]},
    {
        key: 'owners',
        content: [{elementType: 'ExpensifyInput', key: 'owners', type: 'list', required: false, itemFields: [{key: 'name', type: 'text', required: true}]}],
    },
];
const allFields = getAllFields(pages);

describe('getFlowPages', () => {
    it('routes the pages, the confirmation page and one editor per list entry plus one to add', () => {
        // Given a list with one entry
        const values = {type: 'BUSINESS', owners: [{id: 'a1', name: 'Ada'}]};

        // When the flow builds its sub-pages
        const {subPages, skipPages} = getFlowPages(pages, allFields, values, true);

        // Then the editors follow the confirmation page and Next and Back step over them
        expect(subPages.map((page) => page.pageName)).toEqual(['type', 'business', 'owners', CONST.DYNAMIC_FORM.CONFIRMATION_PAGE_KEY, 'owners~new', 'owners~a1']);
        expect(skipPages).toEqual(['owners~new', 'owners~a1']);
    });

    it('skips a page the answers hide and keeps it routable', () => {
        // Given a private recipient, so the business page is hidden
        const values = {type: 'PRIVATE'};

        // When the flow builds its sub-pages
        const {subPages, skipPages, shownPages} = getFlowPages(pages, allFields, values, true);

        // Then the hidden page stays in the routes, so a stale link can be redirected, but Next and Back step over it
        expect(subPages.map((page) => page.pageName)).toContain('business');
        expect(skipPages).toContain('business');
        expect(shownPages.map((page) => page.key)).toEqual(['type', 'owners']);
    });

    it('gives a readonly list no editor pages', () => {
        // Given a readonly list with an entry
        const readonlyPages: DynamicFormFlowPage[] = [
            {
                key: 'owners',
                content: [{elementType: 'ExpensifyInput', key: 'owners', type: 'list', required: false, readonly: true, itemFields: [{key: 'name', type: 'text', required: true}]}],
            },
        ];

        // When the flow builds its sub-pages
        const {subPages} = getFlowPages(readonlyPages, getAllFields(readonlyPages), {owners: [{id: 'a1', name: 'Ada'}]}, true);

        // Then nothing can open an editor that would change it
        expect(subPages.map((page) => page.pageName)).toEqual(['owners', CONST.DYNAMIC_FORM.CONFIRMATION_PAGE_KEY]);
    });

    it('gives a form without pages the confirmation page even when it asks for none', () => {
        // Given a schema with no pages and no confirmation page asked for
        // When the flow builds its sub-pages
        const {subPages, hasConfirmationPage, firstShownPageIndex} = getFlowPages([], [], {}, false);

        // Then the confirmation page is there to land on, since useSubPage needs a page
        expect(hasConfirmationPage).toBe(true);
        expect(subPages.map((page) => page.pageName)).toEqual([CONST.DYNAMIC_FORM.CONFIRMATION_PAGE_KEY]);
        expect(firstShownPageIndex).toBe(0);
    });

    it('ends on the last shown page when the form has no confirmation page', () => {
        // Given a form without a confirmation page whose middle page is hidden
        const values = {type: 'PRIVATE'};

        // When the flow builds its sub-pages
        const {lastShownPageIndex, hasConfirmationPage} = getFlowPages(pages, allFields, values, false);

        // Then the owners page is the last one, so it submits the form
        expect(hasConfirmationPage).toBe(false);
        expect(lastShownPageIndex).toBe(2);
    });
});
