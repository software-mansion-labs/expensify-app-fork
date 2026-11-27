import {fireEvent, render, screen} from '@testing-library/react-native';

import OnyxListItemProvider from '@components/OnyxListItemProvider';

import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';
import createPlatformStackNavigator from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigator';

import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import VerifyAccountPage from '@pages/SimplifiedBankOnboarding/entry/VerifyAccountPage';
import openFlowAtResume from '@pages/SimplifiedBankOnboarding/flows/openFlowAtResume';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {write} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';

import ONYXKEYS from '@src/ONYXKEYS';
import SCREENS from '@src/SCREENS';

import {NavigationContainer} from '@react-navigation/native';
import React from 'react';
import Onyx from 'react-native-onyx';

import answerBankOnboardingRequests from '../../utils/answerBankOnboardingRequests';
import {USD_POLICY_ID} from '../../utils/SimplifiedBankOnboardingTestUtils';
import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

jest.mock('@hooks/useLocalize', () => jest.fn(() => ({translate: (key: string) => key})));
jest.mock('@pages/SimplifiedBankOnboarding/mockBackend/mockApi', () => ({read: jest.fn(), write: jest.fn()}));
jest.mock('@pages/SimplifiedBankOnboarding/flows/openFlowAtResume', () => jest.fn());

const WRONG_CODE = '000000';

// The tests load no translations, so the error shows its translation key
const WRONG_CODE_MESSAGE = 'validateCodeForm.error.incorrectSecurityCode';

const Stack = createPlatformStackNavigator<BankOnboardingLabParamList>();

async function openVerifyAccountPage() {
    render(
        <OnyxListItemProvider>
            <NavigationContainer>
                <Stack.Navigator>
                    <Stack.Screen
                        name={SCREENS.SETTINGS.BANK_ONBOARDING_LAB.VERIFY_ACCOUNT}
                        component={VerifyAccountPage}
                        initialParams={{policyID: USD_POLICY_ID}}
                    />
                </Stack.Navigator>
            </NavigationContainer>
        </OnyxListItemProvider>,
    );
    await waitForBatchedUpdatesWithAct();
}

async function submitCode(code: string) {
    fireEvent.changeText(screen.getByLabelText('common.securityCode'), code);
    fireEvent.press(screen.getByText('common.verify'));
    await waitForBatchedUpdatesWithAct();
}

describe('VerifyAccountPage', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        await Onyx.clear();
        await waitForBatchedUpdatesWithAct();
    });

    afterAll(() => Onyx.clear());

    it('opens the flow in place of the page once the server accepts the code', async () => {
        // Given a user who is not validated yet and a server that accepts the code
        answerBankOnboardingRequests('write', 'success');
        await openVerifyAccountPage();

        // When the user sends the code
        await submitCode(SBO_CONST.MOCK.VALID_VALIDATE_CODE);

        // Then the server gets the typed code, and the page replaces itself with the flow, so Back from the flow skips this form
        expect(write).toHaveBeenCalledWith(WRITE_COMMANDS.VALIDATE_USER, {validateCode: SBO_CONST.MOCK.VALID_VALIDATE_CODE}, expect.anything());
        expect(openFlowAtResume).toHaveBeenCalledWith(expect.objectContaining({shouldReplace: true}));
        expect(screen.queryByText(WRONG_CODE_MESSAGE)).toBeNull();
    });

    it('stays on the page with an error that the next keystroke clears when the server rejects the code', async () => {
        // Given a server that rejects the code
        answerBankOnboardingRequests('write', 'failure');
        await openVerifyAccountPage();

        // When the user sends a wrong code
        await submitCode(WRONG_CODE);

        // Then the flow does not open and the page says why, so the user can try again
        expect(openFlowAtResume).not.toHaveBeenCalled();
        expect(screen.getByText(WRONG_CODE_MESSAGE)).toBeTruthy();

        // When the user starts to type another code
        fireEvent.changeText(screen.getByLabelText('common.securityCode'), '1');
        await waitForBatchedUpdatesWithAct();

        // Then the error of the last attempt goes away, because it no longer describes what the field holds
        expect(screen.queryByText(WRONG_CODE_MESSAGE)).toBeNull();
    });

    it('sends the code once while the server has not answered yet', async () => {
        // Given a server that has not answered yet, like a slow connection
        answerBankOnboardingRequests('write', 'none');
        await openVerifyAccountPage();
        await submitCode(SBO_CONST.MOCK.VALID_VALIDATE_CODE);

        // When the user presses the button again
        fireEvent.press(screen.getByText('common.verify'));
        await waitForBatchedUpdatesWithAct();

        // Then only one request reaches the server, and the flow waits for its answer
        expect(write).toHaveBeenCalledTimes(1);
        expect(openFlowAtResume).not.toHaveBeenCalled();
    });
});
