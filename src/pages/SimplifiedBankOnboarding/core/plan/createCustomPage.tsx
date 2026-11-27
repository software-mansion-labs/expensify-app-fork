/**
 * Builds a custom page: a page of the plan that renders a screen of the flow instead of a form. The plan names the
 * screen and hands it the props that only this screen needs, such as its typed request, so a reader of the plan can
 * jump from the page straight to its screen. The controller adds what it provides to every custom page when it renders
 * the page. The types tie the props to the screen, so a plan cannot hand a screen a request with the wrong input.
 */
import type {PlannedRequest} from '@pages/SimplifiedBankOnboarding/core/requests/types';

import type {ComponentType} from 'react';

import React from 'react';

import type {CustomPageConfig, CustomStepProps, FlowVocabulary} from './types';

/** Where the page sits in its step and how it counts for the resume position */
type CustomPageDefinition<TVocabulary extends FlowVocabulary = FlowVocabulary> = Omit<CustomPageConfig<TVocabulary>, 'kind' | 'canComplete' | 'requestKey' | 'render'>;

/**
 * The props of a screen that the controller also needs to know. A screen takes them under these names, and the page
 * copies them out of the props that the plan gives the screen, so the plan states each of them once.
 */
type ScreenPropsKnownToController = {
    /** The request that the screen sends itself. The controller never sends it, but clears its error when the user leaves the page and blocks the page offline. */
    request?: Pick<PlannedRequest, 'key'>;

    /** False while the screen cannot complete the page yet, so the controller ignores its submit. Defaults to true. */
    canComplete?: boolean;
};

// `NoInfer` lets only the props that the plan passes decide their type, so the screen is checked against them instead of widening them
function createCustomPage<TScreenProps extends Record<string, unknown>, TVocabulary extends FlowVocabulary>(
    Screen: ComponentType<NoInfer<TScreenProps> & CustomStepProps<TVocabulary>>,
    definition: CustomPageDefinition<TVocabulary>,
    screenProps: TScreenProps & ScreenPropsKnownToController,
): CustomPageConfig<TVocabulary> {
    return {
        ...definition,
        kind: 'custom',
        canComplete: screenProps.canComplete,
        requestKey: screenProps.request?.key,
        // The screen gets everything the controller provides, and its props type picks the part that it may use
        render: (controllerProps) => (
            <Screen
                {...controllerProps}
                {...screenProps}
            />
        ),
    };
}

export default createCustomPage;
