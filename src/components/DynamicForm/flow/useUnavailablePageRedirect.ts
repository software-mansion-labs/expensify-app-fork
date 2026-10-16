import type {UseSubPageProps} from '@hooks/useSubPage/types';

import Navigation from '@libs/Navigation/Navigation';

import {useEffect} from 'react';

import type {FlowPages} from './getFlowPages';
import type {DynamicFormSubPageProps} from './types';

import {parseListItemPageName} from './listItemEditor/listItemPageName';

type PageState = Pick<FlowPages, 'subPages' | 'skipPages'> & {
    currentPageName: string | undefined;
    pageIndex: number;
    startFrom: number;
};

type UnavailablePageRedirectOptions = PageState & {
    buildRoute: UseSubPageProps<DynamicFormSubPageProps>['buildRoute'];

    /** Nothing is redirected until the draft has loaded and useSubPage has settled on a page */
    isReady: boolean;
};

/** A page the answers now skip. An entry editor is skipped by Next and Back only, so it stays available. */
function isSkippedPage({skipPages, currentPageName}: PageState): boolean {
    return !!currentPageName && !parseListItemPageName(currentPageName) && skipPages.includes(currentPageName);
}

/** A skipped page is replaced by the next shown page, or the previous one, so Back never lands on it. A stale link opens where a new visit would start. */
function getRedirectTarget(pageState: PageState): string | undefined {
    const {subPages, skipPages, pageIndex, startFrom} = pageState;
    if (!isSkippedPage(pageState)) {
        return subPages.at(startFrom)?.pageName;
    }
    const pageNames = subPages.map((page) => page.pageName);
    const nextShownPageName = pageNames.find((pageName, index) => index > pageIndex && !skipPages.includes(pageName));
    return nextShownPageName ?? pageNames.findLast((pageName, index) => index < pageIndex && !skipPages.includes(pageName));
}

/** Replaces a page the URL opens but the flow cannot show. Returns whether the current page is such a page, so the flow shows a loader instead. */
function useUnavailablePageRedirect({buildRoute, isReady, ...pageState}: UnavailablePageRedirectOptions): boolean {
    const isKnownPage = pageState.subPages.some((page) => page.pageName === pageState.currentPageName);
    const isOnUnavailablePage = isReady && (!isKnownPage || isSkippedPage(pageState));
    const redirectTarget = isOnUnavailablePage ? getRedirectTarget(pageState) : undefined;

    useEffect(() => {
        if (!redirectTarget) {
            return;
        }
        Navigation.navigate(buildRoute(redirectTarget), {forceReplace: true});
    }, [buildRoute, redirectTarget]);

    return isOnUnavailablePage;
}

export default useUnavailablePageRedirect;
