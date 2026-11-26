/**
 * Reads the sub page children of OnboardingStep and answers the questions about the page order: the start page and the
 * pages that Next and Back open.
 *
 * What it hides: the flattening of fragments and arrays, the runtime check of the element props and the start page rule.
 */
import type {PageID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import {flattenElements} from '@pages/SimplifiedBankOnboarding/core/flow/readFlowSteps';

import type React from 'react';

/** The Next target that ends the step */
const NEXT_STEP: unique symbol = Symbol('NEXT_STEP');

/** The Back target that leaves the step as Back on its first page does */
const PREVIOUS_STEP: unique symbol = Symbol('PREVIOUS_STEP');

type PageTarget = PageID | typeof NEXT_STEP;

type BackTarget = PageID | typeof PREVIOUS_STEP;

/** The props every sub page element has. OnboardingStep reads them, so they work only on direct children. */
type SubPageElementProps = {
    /** The URL value of the sub page. Left out only when the block is the content of a single page step. */
    name?: PageID;

    /**
     * True when the answers of this page are known. On a resume (not on Next) the start page is the first page that is
     * not answered.
     */
    isAnswered?: boolean;

    /** The page that Back opens instead of the previous one in order. PREVIOUS_STEP leaves the step. */
    back?: BackTarget;

    /** The page that Next opens instead of the next one in order. NEXT_STEP ends the step. */
    next?: PageTarget;
};

type SubPageEntry = {
    name: PageID;
    isAnswered: boolean;
    back: BackTarget | undefined;
    next: PageTarget | undefined;
    element: React.ReactElement<unknown>;
};

type SubPagePlan = {
    /** The named sub pages in order. Empty for a single page step. */
    pages: SubPageEntry[];

    /** The children as they are, the content of a single page step */
    content: React.ReactNode;
};

type StartPageInput = {
    /** The sub page that the URL names */
    urlPage: PageID | undefined;
    startAt: PageID | undefined;

    /** The user came by Next from the previous step */
    hasArrivedByNext: boolean;
};

function isPageTarget(value: unknown): value is PageTarget {
    return value === NEXT_STEP || typeof value === 'string';
}

function isBackTarget(value: unknown): value is BackTarget {
    return value === PREVIOUS_STEP || typeof value === 'string';
}

function readSubPageProps(element: React.ReactElement<unknown>): SubPageElementProps {
    const props = element.props;
    if (typeof props !== 'object' || props === null) {
        return {};
    }
    return {
        name: 'name' in props && typeof props.name === 'string' ? props.name : undefined,
        isAnswered: 'isAnswered' in props && props.isAnswered === true,
        back: 'back' in props && isBackTarget(props.back) ? props.back : undefined,
        next: 'next' in props && isPageTarget(props.next) ? props.next : undefined,
    };
}

/**
 * The sub pages of a step. When no child has a name, the step is a single page step and its children are its content.
 * A child without a name among named ones is a mistake of the step, so it throws in development and is dropped otherwise.
 */
function readSubPages(children: React.ReactNode): SubPagePlan {
    const elements = flattenElements(children).map((element) => ({element, props: readSubPageProps(element)}));
    if (!elements.some(({props}) => props.name)) {
        return {pages: [], content: children};
    }

    const pages = elements.flatMap(({element, props}): SubPageEntry[] => {
        if (!props.name) {
            if (__DEV__) {
                throw new Error('OnboardingStep: every sub page needs a name when one of them has one');
            }
            return [];
        }
        return [{name: props.name, isAnswered: !!props.isAnswered, back: props.back, next: props.next, element}];
    });
    return {pages, content: children};
}

/**
 * The page a step opens: the page of the URL when it is rendered, else `startAt` when it is rendered, else the first
 * page when the user arrived by Next, else the first page that is not answered (the last one when all are).
 */
function getStartPage(pages: SubPageEntry[], {urlPage, startAt, hasArrivedByNext}: StartPageInput): SubPageEntry | undefined {
    const namedPage = pages.find((page) => page.name === urlPage) ?? pages.find((page) => page.name === startAt);
    if (namedPage) {
        return namedPage;
    }
    if (hasArrivedByNext) {
        return pages.at(0);
    }
    return pages.find((page) => !page.isAnswered) ?? pages.at(-1);
}

/** The page that Next opens from `current`, or NEXT_STEP when the step ends */
function getNextPage(pages: SubPageEntry[], current: SubPageEntry, target: PageTarget | undefined): SubPageEntry | typeof NEXT_STEP {
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
function getPreviousPage(pages: SubPageEntry[], current: SubPageEntry): SubPageEntry | undefined {
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

export {getNextPage, getPreviousPage, getStartPage, NEXT_STEP, PREVIOUS_STEP, readSubPages};
export type {BackTarget, PageTarget, SubPageElementProps, SubPageEntry, SubPagePlan};
