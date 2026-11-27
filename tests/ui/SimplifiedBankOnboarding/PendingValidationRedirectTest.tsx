import {render} from '@testing-library/react-native';

import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {leaveOnboarding, openFlow} from '@pages/SimplifiedBankOnboarding/core/flow/flowRoutes';
import PendingValidationRedirect from '@pages/SimplifiedBankOnboarding/entry/views/PendingValidationRedirect';

import ROUTES from '@src/ROUTES';

import {useIsFocused} from '@react-navigation/native';
import React from 'react';

import {TEST_POLICY_ID} from '../../utils/BankOnboardingLabTestUtils';

jest.mock('@components/ReimbursementAccountLoadingIndicator', () => () => null);
jest.mock('@pages/SimplifiedBankOnboarding/core/flow/flowRoutes', () => ({
    ...jest.requireActual<Record<string, unknown>>('@pages/SimplifiedBankOnboarding/core/flow/flowRoutes'),
    openFlow: jest.fn(),
    leaveOnboarding: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<Record<string, unknown>>('@react-navigation/native'),
    useIsFocused: jest.fn(() => true),
}));

const BACK_TO = ROUTES.SETTINGS_BANK_ONBOARDING_LAB;

function renderRedirect() {
    const keepAccountOnUnmount = jest.fn();
    const releaseAccountOnUnmount = jest.fn();
    const renderElement = () => (
        <PendingValidationRedirect
            policyID={TEST_POLICY_ID}
            backTo={BACK_TO}
            keepAccountOnUnmount={keepAccountOnUnmount}
            releaseAccountOnUnmount={releaseAccountOnUnmount}
        />
    );
    const {rerender} = render(renderElement());

    /** Renders the redirect again after the focus of its screen changed */
    const changeFocus = (isFocused: boolean) => {
        jest.mocked(useIsFocused).mockReturnValue(isFocused);
        rerender(renderElement());
    };

    return {keepAccountOnUnmount, releaseAccountOnUnmount, changeFocus};
}

describe('PendingValidationRedirect', () => {
    beforeEach(() => {
        jest.mocked(openFlow).mockClear();
        jest.mocked(leaveOnboarding).mockClear();
        jest.mocked(useIsFocused).mockReturnValue(true);
    });

    it('opens the validation step once and keeps the account that the step reads', () => {
        // Given the entry of a pending account, shown to the user
        // When the redirect renders twice on the focused entry
        const {keepAccountOnUnmount, changeFocus} = renderRedirect();
        changeFocus(true);

        // Then the validation step opens once, and the account outlives the entry, because the step fetches nothing
        expect(openFlow).toHaveBeenCalledTimes(1);
        expect(openFlow).toHaveBeenCalledWith({kind: 'usd', policyID: TEST_POLICY_ID, backTo: BACK_TO}, {step: SBO_CONST.USD.PAGE_NAMES.VALIDATION});
        expect(keepAccountOnUnmount).toHaveBeenCalledTimes(1);
        expect(leaveOnboarding).not.toHaveBeenCalled();
    });

    it('leaves the onboarding when the focus returns after the validation step covered the entry', () => {
        // Given the entry that opened the validation step, which then covered it
        const {releaseAccountOnUnmount, changeFocus} = renderRedirect();
        changeFocus(false);

        // When the user goes back to the entry
        changeFocus(true);

        // Then the entry leaves instead of showing its loader again, and lets its cleanup clear the account
        expect(openFlow).toHaveBeenCalledTimes(1);
        expect(releaseAccountOnUnmount).toHaveBeenCalledTimes(1);
        expect(leaveOnboarding).toHaveBeenCalledWith(BACK_TO);
    });

    it('does not open the validation step when the account turned pending under the flow', () => {
        // Given the entry covered by the flow, which already shows the validation step
        jest.mocked(useIsFocused).mockReturnValue(false);

        // When the account turns pending under the flow, and the user later goes back to the entry
        const {keepAccountOnUnmount, changeFocus} = renderRedirect();
        changeFocus(true);

        // Then no second validation step opens, the account stays for the step of the flow, and the entry leaves the onboarding
        expect(openFlow).not.toHaveBeenCalled();
        expect(keepAccountOnUnmount).toHaveBeenCalledTimes(1);
        expect(leaveOnboarding).toHaveBeenCalledWith(BACK_TO);
    });
});
