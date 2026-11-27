/**
 * The page order of a step: the start page, the pages that Next and Back open, and the page that an edit link without a
 * return page returns to.
 *
 * What it hides: the start page rule and the fallbacks of the `next` and `back` overrides.
 */
import type {PageID} from '@pages/SimplifiedBankOnboarding/contract/ids';

import type React from 'react';

/** The Next target that ends the step */
const NEXT_STEP: unique symbol = Symbol('NEXT_STEP');

/** The Back target that leaves the step as Back on its first page does */
const PREVIOUS_STEP: unique symbol = Symbol('PREVIOUS_STEP');

/** A Next target that the content of a page gives at run time. The step checks it against its pages. */
type PageTarget = PageID | typeof NEXT_STEP;

/**
 * One sub page of a step. `TPageName` is the union of the page names of the step, so `back` and `next` can only name a
 * page of the same step. They do not take part in the inference of `TPageName`, so a typo fails the typecheck.
 */
type SubPageConfig<TPageName extends string> = {
    /** The URL value of the sub page */
    name: TPageName;

    /**
     * True when the answers of this page are known. On a resume (not on Next) the start page is the first page that is
     * not answered.
     */
    isAnswered?: boolean;

    /** The page that Back opens instead of the previous one in order. PREVIOUS_STEP leaves the step. */
    back?: NoInfer<TPageName> | typeof PREVIOUS_STEP;

    /** The page that Next opens instead of the next one in order. NEXT_STEP ends the step. */
    next?: NoInfer<TPageName> | typeof NEXT_STEP;

    content: React.ReactNode;
};

type StartPageInput<TPageName extends string> = {
    /** The sub page that the URL names */
    urlPage: PageID | undefined;
    startAt: TPageName | undefined;

    /** The user came by Next from the previous step */
    hasArrivedByNext: boolean;
};

/**
 * The name of the confirmation page in every step that has one. The steps define their page names themselves, so this
 * is a convention, and it is used only for an edit link that names no return page.
 */
const CONFIRMATION_PAGE_NAME = 'confirmation';

/**
 * The page a step opens: the page of the URL when the step has it, else `startAt` when the step has it, else the first
 * page when the user arrived by Next, else the first page that is not answered (the last one when all are).
 */
function getStartPage<TPageName extends string>(
    pages: Array<SubPageConfig<TPageName>>,
    {urlPage, startAt, hasArrivedByNext}: StartPageInput<TPageName>,
): SubPageConfig<TPageName> | undefined {
    const namedPage = pages.find((page) => page.name === urlPage) ?? pages.find((page) => page.name === startAt);
    if (namedPage) {
        return namedPage;
    }
    if (hasArrivedByNext) {
        return pages.at(0);
    }
    return pages.find((page) => !page.isAnswered) ?? pages.at(-1);
}

/** The page that Next opens from `current`, or NEXT_STEP when the step ends. A target that names no page of the step opens the next page in order. */
function getNextPage<TPageName extends string>(
    pages: Array<SubPageConfig<TPageName>>,
    current: SubPageConfig<TPageName>,
    target: PageTarget | undefined,
): SubPageConfig<TPageName> | typeof NEXT_STEP {
    const destination = target ?? current.next;
    if (destination === NEXT_STEP) {
        return NEXT_STEP;
    }
    const namedPage = pages.find((page) => page.name === destination);
    if (namedPage) {
        return namedPage;
    }
    const currentIndex = pages.indexOf(current);
    return pages.at(currentIndex + 1) ?? NEXT_STEP;
}

/** The page that Back opens from `current`, or undefined when Back leaves the step (the first page, PREVIOUS_STEP) */
function getPreviousPage<TPageName extends string>(pages: Array<SubPageConfig<TPageName>>, current: SubPageConfig<TPageName>): SubPageConfig<TPageName> | undefined {
    if (current.back === PREVIOUS_STEP) {
        return undefined;
    }
    const namedPage = pages.find((page) => page.name === current.back);
    if (namedPage) {
        return namedPage;
    }
    const currentIndex = pages.indexOf(current);
    return currentIndex > 0 ? pages.at(currentIndex - 1) : undefined;
}

/**
 * The page that edit mode of `current` returns to when the URL names none: the first confirmation after it, else the
 * last page. Only a link made before the edit route had the `returnTo` param names none.
 */
function getDefaultEditReturnPage<TPageName extends string>(pages: Array<SubPageConfig<TPageName>>, current: SubPageConfig<TPageName>): SubPageConfig<TPageName> | undefined {
    const currentIndex = pages.indexOf(current);
    return pages.slice(currentIndex + 1).find((page) => page.name === CONFIRMATION_PAGE_NAME) ?? pages.at(-1);
}

export {getDefaultEditReturnPage, getNextPage, getPreviousPage, getStartPage, NEXT_STEP, PREVIOUS_STEP};
export type {PageTarget, SubPageConfig};
