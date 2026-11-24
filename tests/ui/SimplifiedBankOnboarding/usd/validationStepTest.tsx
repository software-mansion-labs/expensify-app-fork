import {fireEvent, render, screen} from '@testing-library/react-native';

import type InteractiveStepWrapperModule from '@components/InteractiveStepWrapper';

import Navigation from '@libs/Navigation/Navigation';
import type BankOnboardingLabParamList from '@libs/Navigation/paramLists/BankOnboardingLabParamList';
import type {PlatformStackScreenProps} from '@libs/Navigation/PlatformStackNavigation/types';

import {USDFlowPage} from '@pages/SimplifiedBankOnboarding';
import type {OnboardingAccount} from '@pages/SimplifiedBankOnboarding';
import type {BankAccountState} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {getFlowRoute} from '@pages/SimplifiedBankOnboarding/core';
import type {FlowTarget} from '@pages/SimplifiedBankOnboarding/core';

import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type {Route} from '@src/ROUTES';
import SCREENS from '@src/SCREENS';

import type * as NativeNavigation from '@react-navigation/native';
import type ReactNative from 'react-native';

import React from 'react';
import Onyx from 'react-native-onyx';

import waitForBatchedUpdatesWithAct from '../../../utils/waitForBatchedUpdatesWithAct';

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<typeof NativeNavigation>('@react-navigation/native'),
    useIsFocused: () => true,
    useRoute: () => ({key: 'current-route', name: 'CurrentScreen'}),
    useNavigation: () => ({getState: () => ({routes: []})}),
    useNavigationState: <TResult,>(selector: (state: {routes: []}) => TResult) => selector({routes: []}),
}));

jest.mock('@libs/Navigation/Navigation', () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setParams: jest.fn(),
    dismissModal: jest.fn(),
}));

jest.mock('@pages/SimplifiedBankOnboarding/core/accountRead/openOnboardingPage', () => ({
    __esModule: true,
    default: jest.fn(() => Promise.resolve({status: 'succeeded'})),
    getAccountLoadingData: jest.fn(() => ({})),
}));

jest.mock('@hooks/useLocalize', () => jest.fn(() => ({translate: (key: string) => key})));

// The real wrapper needs the whole screen stack. The stand-in prints the title, renders the content and offers the
// header back button.
jest.mock('@components/InteractiveStepWrapper', () => {
    const RN = jest.requireActual<typeof ReactNative>('react-native');
    return ({headerTitle, handleBackButtonPress, children}: React.ComponentProps<typeof InteractiveStepWrapperModule>) => (
        <RN.View>
            <RN.Text>{`title ${headerTitle}`}</RN.Text>
            <RN.Pressable
                accessibilityRole="button"
                accessibilityLabel="header back"
                onPress={handleBackButtonPress}
            />
            {children}
        </RN.View>
    );
});

// Each content view has its own behaviour. These stand-ins show which one the state picked.
jest.mock('@pages/SimplifiedBankOnboarding/flows/usd/validation/ConnectedBankAccount', () => {
    const RN = jest.requireActual<typeof ReactNative>('react-native');
    return () => <RN.Text>content connected</RN.Text>;
});
jest.mock('@pages/SimplifiedBankOnboarding/flows/usd/validation/MaxAttemptsReachedMessage', () => {
    const RN = jest.requireActual<typeof ReactNative>('react-native');
    return () => <RN.Text>content max attempts</RN.Text>;
});
jest.mock('@pages/SimplifiedBankOnboarding/flows/usd/validation/DepositsForm', () => {
    const RN = jest.requireActual<typeof ReactNative>('react-native');
    return () => <RN.Text>content deposits</RN.Text>;
});
jest.mock('@pages/SimplifiedBankOnboarding/flows/usd/validation/FinishReviewCard', () => {
    const RN = jest.requireActual<typeof ReactNative>('react-native');
    return () => <RN.Text>content review</RN.Text>;
});

const POLICY_ID = '1';
const {STATE, USD} = SBO_CONST;
const CONTENT_TEXTS = ['content connected', 'content max attempts', 'content deposits', 'content review'];
const BACK_TO: Route = ROUTES.SETTINGS_BANK_ONBOARDING_LAB;

type USDFlowPageProps = PlatformStackScreenProps<BankOnboardingLabParamList, typeof SCREENS.SETTINGS.BANK_ONBOARDING_LAB.USD_SETUP>;

// The flow page does not read navigation. This inert test double only satisfies the navigator-provided prop.
// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
const usdNavigation = {} as USDFlowPageProps['navigation'];

/** An account of the route's workspace, so the account gate of the flow shows the step without a read */
function getAccount(state: BankAccountState, maxAttemptsReached?: boolean): OnboardingAccount {
    return {
        achData: {policyID: POLICY_ID, bankAccountID: 5, state},
        maxAttemptsReached,
    };
}

async function renderValidationStep(account: OnboardingAccount, backTo?: Route) {
    await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, account);
    await waitForBatchedUpdatesWithAct();
    render(
        <USDFlowPage
            route={{
                key: 'usd',
                name: SCREENS.SETTINGS.BANK_ONBOARDING_LAB.USD_SETUP,
                params: {
                    policyID: POLICY_ID,
                    page: USD.PAGE_NAMES.VALIDATION,
                    backTo,
                },
            }}
            navigation={usdNavigation}
        />,
    );
    await waitForBatchedUpdatesWithAct();
}

function expectOnlyContent(expectedText: string | undefined) {
    for (const text of CONTENT_TEXTS) {
        if (text === expectedText) {
            expect(screen.getByText(text)).toBeOnTheScreen();
        } else {
            expect(screen.queryByText(text)).not.toBeOnTheScreen();
        }
    }
}

describe('USD validation step', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        await Onyx.clear();
        await waitForBatchedUpdatesWithAct();
    });

    describe('state chain', () => {
        it('shows the connected view for an open account, even after too many wrong amounts', async () => {
            // Given an open account that also counted too many wrong amounts, because the open state is checked first
            await renderValidationStep(getAccount(STATE.OPEN, true));

            // Then the connected view is shown under the title of a new bank account
            expectOnlyContent('content connected');
            expect(screen.getByText('title bankAccount.addBankAccount')).toBeOnTheScreen();
        });

        it('shows the block message for a pending account with too many wrong amounts', async () => {
            // Given a pending account that reached the limit of wrong amounts, which wins over the pending state
            await renderValidationStep(getAccount(STATE.PENDING, true));

            // Then the block message is shown, and the title still follows the pending state
            expectOnlyContent('content max attempts');
            expect(screen.getByText('title connectBankAccountStep.validateYourBankAccount')).toBeOnTheScreen();
        });

        it('shows the deposit form for a pending account', async () => {
            // Given an account that waits for the test deposit amounts
            await renderValidationStep(getAccount(STATE.PENDING));

            // Then the deposit form is shown under the validation title
            expectOnlyContent('content deposits');
            expect(screen.getByText('title connectBankAccountStep.validateYourBankAccount')).toBeOnTheScreen();
        });

        it('shows the review card for an account in review', async () => {
            // Given an account that the server reviews
            await renderValidationStep(getAccount(STATE.VERIFYING));

            // Then the review card is shown under the title of a new bank account
            expectOnlyContent('content review');
            expect(screen.getByText('title bankAccount.addBankAccount')).toBeOnTheScreen();
        });

        it('shows no content for an account in any other state', async () => {
            // Given an account whose setup is still running, which the step has nothing to show for
            await renderValidationStep(getAccount(STATE.SETUP));

            // Then no content view is shown
            expectOnlyContent(undefined);
        });

        it('swaps the deposit form for the connected view when the server opens the account', async () => {
            // Given the deposit form of a pending account
            await renderValidationStep(getAccount(STATE.PENDING));

            // When a right answer of the server opens the account
            await Onyx.merge(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {
                achData: {state: STATE.OPEN},
            });
            await waitForBatchedUpdatesWithAct();

            // Then the step follows the state without any navigation
            expectOnlyContent('content connected');
            expect(Navigation.navigate).not.toHaveBeenCalled();
        });
    });

    describe('Back', () => {
        it('leaves the flow to backTo while the account is pending', async () => {
            // Given a pending account in a flow opened with backTo, where the entry would only open this step again
            await renderValidationStep(getAccount(STATE.PENDING), BACK_TO);

            // When the user presses the header back button
            fireEvent.press(screen.getByLabelText('header back'));

            // Then the whole flow is left to backTo
            expect(Navigation.goBack).toHaveBeenCalledWith(BACK_TO);
            expect(Navigation.dismissModal).not.toHaveBeenCalled();
        });

        it('closes the flow while the account is pending and there is no backTo', async () => {
            // Given a pending account in a flow opened without backTo
            await renderValidationStep(getAccount(STATE.PENDING));

            // When the user presses the header back button
            fireEvent.press(screen.getByLabelText('header back'));

            // Then the modal of the flow is dismissed
            expect(Navigation.dismissModal).toHaveBeenCalled();
            expect(Navigation.goBack).not.toHaveBeenCalled();
        });

        it('goes back to the agreements step while the account is in review', async () => {
            // Given an account in review, where Back keeps the normal order of the steps
            const target: FlowTarget = {
                kind: 'usd',
                policyID: POLICY_ID,
                backTo: BACK_TO,
            };
            await renderValidationStep(getAccount(STATE.VERIFYING), BACK_TO);

            // When the user presses the header back button
            fireEvent.press(screen.getByLabelText('header back'));

            // Then the previous step that is not skipped opens, because no documents are required
            expect(Navigation.goBack).toHaveBeenCalledWith(getFlowRoute(target, {step: USD.PAGE_NAMES.ACH_CONTRACT}));
            expect(Navigation.dismissModal).not.toHaveBeenCalled();
        });
    });
});
