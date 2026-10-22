import type {DynamicFormFlowProps} from '@components/DynamicForm/types';

import Navigation from '@libs/Navigation/Navigation';

import {useEffect} from 'react';

import type {FlowPages} from './getFlowPages';

import {parseListItemPageName} from './listItemEditor';

type UnavailablePageRedirectOptions = Pick<FlowPages, 'subPages' | 'skipPages'> &
    Pick<DynamicFormFlowProps, 'buildRoute'> & {
        currentPageName: string | undefined;
        pageIndex: number;

        /** The page a new visit starts on, which a stale link opens instead */
        startFrom: number;

        /** Nothing is redirected until the draft has loaded and useSubPage has settled on a page */
        isReady: boolean;
    };

/**
 * Replaces a page the URL opens but the flow cannot show. A page the current answers skip is replaced by the next shown page, or the previous one, so Back never lands on it.
 * A stale link opens where a new visit would start. Returns whether the current page is such a page, so the flow shows a spinner instead.
 */
function useUnavailablePageRedirect({subPages, skipPages, currentPageName, pageIndex, startFrom, buildRoute, isReady}: UnavailablePageRedirectOptions): boolean {
    // An entry editor is skipped by Next and Back only, so it stays available
    const isOnSkippedPage = !parseListItemPageName(currentPageName) && !!currentPageName && skipPages.includes(currentPageName);
    const isOnUnavailablePage = isReady && (!subPages.some((page) => page.pageName === currentPageName) || isOnSkippedPage);

    const pageNames = subPages.map((page) => page.pageName);
    const nextShownPageName = pageNames.find((pageName, index) => index > pageIndex && !skipPages.includes(pageName));
    const previousShownPageName = pageNames.findLast((pageName, index) => index < pageIndex && !skipPages.includes(pageName));
    const unavailablePageTarget = isOnSkippedPage ? (nextShownPageName ?? previousShownPageName) : subPages.at(startFrom)?.pageName;

    useEffect(() => {
        if (!isOnUnavailablePage || !unavailablePageTarget) {
            return;
        }
        Navigation.navigate(buildRoute(unavailablePageTarget), {forceReplace: true});
    }, [isOnUnavailablePage, buildRoute, unavailablePageTarget]);

    return isOnUnavailablePage;
}

export default useUnavailablePageRedirect;
