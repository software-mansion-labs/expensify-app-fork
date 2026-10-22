import type {DynamicFormFlowPage, DynamicFormSubPageProps, DynamicFormValues} from '@components/DynamicForm/types';
import {getListItems} from '@components/DynamicForm/utils/listItems';

import type {PageConfig} from '@hooks/useSubPage/types';

import {findLastPageIndex} from '@libs/SubPageUtils';

import CONST from '@src/CONST';
import type {DynamicFormField} from '@src/types/onyx';

import {getListItemPageName} from './listItemEditor';
import {isPageShown} from './pages';
import DynamicFormConfirmationPage from './subPages/DynamicFormConfirmationPage';
import DynamicFormFieldsPage from './subPages/DynamicFormFieldsPage';
import DynamicFormListItemPage from './subPages/DynamicFormListItemPage';

type FlowPages = {
    /** Every sub-page useSubPage routes to: the form's pages, the confirmation page, then the list entry editors */
    subPages: Array<PageConfig<DynamicFormSubPageProps>>;

    /** Sub-pages Next and Back step over */
    skipPages: string[];

    /** The form's pages the answers show */
    shownPages: DynamicFormFlowPage[];

    hasConfirmationPage: boolean;
    firstShownPageIndex: number;
    lastShownPageIndex: number;
};

/** Entry editors come after the confirmation page and are skipped by Next and Back, so only an entry's Add, Edit or row opens them. A readonly list has no editors. */
function getListItemPageNames(allFields: DynamicFormField[], values: DynamicFormValues): string[] {
    return allFields.flatMap((field) =>
        field.type === 'list' && !field.readonly ? [getListItemPageName(field.key), ...getListItems(values[field.key]).map((item) => getListItemPageName(field.key, item.id))] : [],
    );
}

/** The sub-pages of the flow and which of them Next and Back step over. A form without pages gets the confirmation page, since useSubPage needs at least one page. */
function getFlowPages(pages: DynamicFormFlowPage[], allFields: DynamicFormField[], values: DynamicFormValues, hasConfirmation: boolean): FlowPages {
    const shownPages = pages.filter((page) => isPageShown(page, values, allFields));
    const hasConfirmationPage = pages.length === 0 || hasConfirmation;
    const listItemPageNames = getListItemPageNames(allFields, values);
    const subPages: Array<PageConfig<DynamicFormSubPageProps>> = [
        ...pages.map((page) => ({pageName: page.key, component: DynamicFormFieldsPage})),
        ...(hasConfirmationPage ? [{pageName: CONST.DYNAMIC_FORM.CONFIRMATION_PAGE_KEY, component: DynamicFormConfirmationPage}] : []),
        ...listItemPageNames.map((pageName) => ({pageName, component: DynamicFormListItemPage})),
    ];
    // While nothing is shown no page is skipped, since useSubPage needs a page that is not skipped
    const skippedPages = shownPages.length > 0 ? pages.filter((page) => !shownPages.includes(page)) : [];
    const skipPages = [...skippedPages.map((page) => page.key), ...listItemPageNames];

    return {
        subPages,
        skipPages,
        shownPages,
        hasConfirmationPage,
        firstShownPageIndex: subPages.findIndex((page) => !skipPages.includes(page.pageName)),
        lastShownPageIndex: findLastPageIndex(subPages, skipPages),
    };
}

export default getFlowPages;
export type {FlowPages};
