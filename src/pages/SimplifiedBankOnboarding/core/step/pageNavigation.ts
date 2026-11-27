/**
 * The navigation of the content of a sub page or a single page step. OnboardingStep provides it, so a page moves by
 * the rules of its step and never builds a route.
 */
import type {PageID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import type {RequestOutcome} from '@pages/SimplifiedBankOnboarding/core/requests/types';

import {createContext, useContext} from 'react';

import type {PageTarget} from './subPages';

/** For the content of a sub page or a single page step. Works only inside OnboardingStep. */
type PageNavigation = {
    /** The page shown now, undefined in a single page step */
    page: PageID | undefined;
    isEditing: boolean;

    /** Opens `target`, else the `next` of the page config, else the next page in order */
    goNext: (target?: PageTarget) => void;

    /**
     * Waits for `outcome`. When it succeeded and the screen still shows this page, calls goNext(target). A save that
     * resolves with nothing counts as a success. A second call while one waits is ignored.
     */
    goNextAfter: (outcome: Promise<RequestOutcome | void>, target?: PageTarget) => void;

    /** Whether goNext(target) ends the step by the rules of OnboardingStep. It never does in edit mode, and always in a single page step. */
    endsStep: (target?: PageTarget) => boolean;

    /** Back by the rules of OnboardingStep */
    goBack: () => void;

    /** Opens a page of this step. `isEditing` makes Next and Back of that page return to the page that opened it. */
    openPage: (name: PageID, options?: {isEditing?: boolean}) => void;
};

/** The data half and the function half. A provider value holds either data or functions (rule context-provider-split-values). */
type PageNavigationState = Pick<PageNavigation, 'page' | 'isEditing'>;
type PageNavigationActions = Omit<PageNavigation, keyof PageNavigationState>;

const PageNavigationStateContext = createContext<PageNavigationState | undefined>(undefined);
const PageNavigationActionsContext = createContext<PageNavigationActions | undefined>(undefined);

function usePageNavigation(): PageNavigation {
    const state = useContext(PageNavigationStateContext);
    const actions = useContext(PageNavigationActionsContext);
    if (!state || !actions) {
        throw new Error('usePageNavigation works only inside OnboardingStep');
    }
    return {...state, ...actions};
}

export {PageNavigationActionsContext, PageNavigationStateContext, usePageNavigation};
export type {PageNavigation, PageNavigationActions, PageNavigationState};
