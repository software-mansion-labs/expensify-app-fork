import getStartPageIndex from '@components/DynamicForm/flow/getStartPageIndex';
import {getAllFields} from '@components/DynamicForm/flow/pages/getPages';
import type {DynamicFormFlowPage} from '@components/DynamicForm/flow/types';

import CONST from '@src/CONST';
import IntlStore from '@src/languages/IntlStore';

import {translateLocal} from '../../../../utils/TestHelper';

const pages: DynamicFormFlowPage[] = [
    {key: 'name', content: [{elementType: 'ExpensifyInput', key: 'name', type: 'text', required: true}]},
    {key: 'consent', content: [{elementType: 'ExpensifyInput', key: 'consent', type: 'boolean', required: false}]},
    {key: 'city', content: [{elementType: 'HTMLInput', key: 'city', name: 'City', type: 'text', required: true}]},
];
const allFields = getAllFields(pages);
const options = {pages, allFields, isDraftLoading: false, firstShownPageIndex: 0, lastShownPageIndex: 3, translate: translateLocal};

describe('getStartPageIndex', () => {
    beforeAll(() => {
        IntlStore.load(CONST.LOCALES.DEFAULT);
    });

    it('waits while the draft loads', () => {
        // Given a draft that has not loaded yet
        // When the flow picks where the visit starts
        const startFrom = getStartPageIndex({...options, draftValues: {}, isDraftLoading: true});

        // Then useSubPage is told to wait
        expect(startFrom).toBe(-1);
    });

    it('starts a new form on its first shown page', () => {
        // Given an empty draft
        // When the flow picks where the visit starts
        const startFrom = getStartPageIndex({...options, draftValues: {}});

        // Then the visit starts from the beginning
        expect(startFrom).toBe(0);
    });

    it('resumes at the first page with a gap', () => {
        // Given a draft that answers the first page only
        // When the flow picks where the visit starts
        const startFrom = getStartPageIndex({...options, draftValues: {name: 'Ada'}});

        // Then the visit resumes at the HTML input still unanswered, since the optional checkbox has no gap
        expect(startFrom).toBe(2);
    });

    it('counts a No as progress', () => {
        // Given a form that opens with an optional checkbox, and a draft whose only answer is that checkbox left clear
        const consentFirstPages = pages.slice(1);
        const consentFirstOptions = {...options, pages: consentFirstPages, allFields: getAllFields(consentFirstPages)};

        // When the flow picks where the visit starts
        const startFrom = getStartPageIndex({...consentFirstOptions, draftValues: {consent: false}});

        // Then the visit resumes at the city page, the first gap, instead of starting over on the checkbox
        expect(startFrom).toBe(1);
    });

    it('opens the last page of a complete draft', () => {
        // Given a draft that answers every page
        // When the flow picks where the visit starts
        const startFrom = getStartPageIndex({...options, draftValues: {name: 'Ada', city: 'London'}});

        // Then the visit opens the last shown page, which is the confirmation page
        expect(startFrom).toBe(3);
    });
});
