import {render} from '@testing-library/react-native';

import createCustomPage from '@pages/SimplifiedBankOnboarding/core/plan/createCustomPage';
import type {CustomPageProps} from '@pages/SimplifiedBankOnboarding/core/plan/types';
import type {PlannedRequest, RequestOutcome} from '@pages/SimplifiedBankOnboarding/core/requests/types';

import React from 'react';

const PAGE_ID = 'deposits';
const REQUEST_KEY = 'validate:policy-1';
const POLICY_ID = 'policy-1';

type DepositsScreenProps = Pick<CustomPageProps, 'policyID' | 'goToStep'> & {
    request: PlannedRequest<string[]>;
    canComplete: boolean;
};

const sendRequest = jest.fn((): Promise<RequestOutcome> => Promise.resolve({status: 'succeeded'}));
const request: PlannedRequest<string[]> = {key: REQUEST_KEY, send: sendRequest};

describe('createCustomPage', () => {
    it('tells the controller the request key and whether the page can be completed', () => {
        // Given a screen that takes its request and its readiness from the plan
        const DepositsScreen = jest.fn<null, [DepositsScreenProps]>(() => null);

        // When the plan builds its page
        const page = createCustomPage(DepositsScreen, {id: PAGE_ID, isComplete: false, shouldExitOnBack: true}, {request, canComplete: false});

        // Then the page holds them as plain data, because the controller watches the request and blocks the submit without rendering the screen
        expect(page).toMatchObject({kind: 'custom', id: PAGE_ID, isComplete: false, shouldExitOnBack: true, requestKey: REQUEST_KEY, canComplete: false});
        expect(DepositsScreen).not.toHaveBeenCalled();
    });

    it('leaves the request key and the readiness out for a screen that takes neither', () => {
        // Given a screen that only reports back, like the finish page
        function FinishScreen() {
            return null;
        }

        // When the plan builds its page
        const page = createCustomPage(FinishScreen, {id: PAGE_ID, isComplete: false}, {});

        // Then the page has no request to watch and can always be completed, so the controller lets it submit offline
        expect(page.requestKey).toBeUndefined();
        expect(page.canComplete).toBeUndefined();
    });

    it('renders the screen with the props of the plan and the props of the controller', () => {
        // Given the page of a screen that takes props from both
        const DepositsScreen = jest.fn<null, [DepositsScreenProps]>(() => null);
        const page = createCustomPage(DepositsScreen, {id: PAGE_ID, isComplete: false}, {request, canComplete: true});
        const controllerProps: CustomPageProps = {policyID: POLICY_ID, isSubmitting: false, onComplete: jest.fn(), goToStep: jest.fn()};

        // When the controller renders the page
        render(<>{page.render(controllerProps)}</>);

        // Then the screen gets what the plan gave it next to what the controller provides, so neither side has to know the other
        expect(DepositsScreen.mock.calls.at(0)?.at(0)).toEqual({...controllerProps, request, canComplete: true});
    });
});
