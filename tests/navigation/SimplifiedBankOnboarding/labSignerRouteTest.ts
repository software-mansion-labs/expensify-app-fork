import getStateFromPath from '@libs/Navigation/helpers/getStateFromPath';

import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';

import ROUTES from '@src/ROUTES';
import SCREENS from '@src/SCREENS';

import {findFocusedRoute} from '@react-navigation/native';

const POLICY_ID = 'ABC123';
const BANK_ACCOUNT_ID = 42;
const {NAME} = SBO_CONST.ENTER_SIGNER_INFO_SUB_PAGES;

type LabSignerRouteParams = Parameters<typeof ROUTES.SETTINGS_BANK_ONBOARDING_LAB_ENTER_SIGNER_INFO.getRoute>[0];

describe('the lab route of the invited director', () => {
    it.each<[string, LabSignerRouteParams]>([
        ['the first page', {}],
        ['a sub page', {subPage: NAME}],
        ['a sub page opened for an edit', {subPage: NAME, action: 'edit'}],
    ])('opens the lab screen for %s', (_label, pageParams) => {
        // Given a lab link to the director form, built the way the lab navigates to it
        const route = ROUTES.SETTINGS_BANK_ONBOARDING_LAB_ENTER_SIGNER_INFO.getRoute({policyID: POLICY_ID, bankAccountID: BANK_ACCOUNT_ID, ...pageParams});

        // When the link is loaded directly or refreshed
        const state = getStateFromPath(route);
        const focusedRoute = state ? findFocusedRoute(state) : undefined;

        // Then the lab screen opens with the page from the URL, and not the real signer screen, whose dynamic route takes
        // any URL that ends with its own path
        expect(focusedRoute?.name).toBe(SCREENS.SETTINGS.BANK_ONBOARDING_LAB.ENTER_SIGNER_INFO);
        expect(focusedRoute?.params).toMatchObject({policyID: POLICY_ID, ...pageParams});
    });
});
