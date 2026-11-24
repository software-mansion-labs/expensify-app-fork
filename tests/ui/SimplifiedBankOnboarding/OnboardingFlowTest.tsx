import {render, screen} from '@testing-library/react-native';

import Text from '@components/Text';

import useNetwork from '@hooks/useNetwork';

import Navigation from '@libs/Navigation/Navigation';

import {DEFAULT_ACCOUNT} from '@pages/SimplifiedBankOnboarding/contract/defaultAccount';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {StepID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import type {OnboardingAccount} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import openOnboardingPage from '@pages/SimplifiedBankOnboarding/core/accountRead/openOnboardingPage';
import {useFlowStepPosition} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import type {FlowTarget} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import {getFlowRoute} from '@pages/SimplifiedBankOnboarding/core/flow/flowRoutes';
import FlowStep from '@pages/SimplifiedBankOnboarding/core/flow/FlowStep';
import OnboardingFlow from '@pages/SimplifiedBankOnboarding/core/flow/OnboardingFlow';
import type {RequestOutcome} from '@pages/SimplifiedBankOnboarding/core/requests/types';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import type ReactNative from 'react-native';

import React from 'react';
import Onyx from 'react-native-onyx';

import getOnyxValue from '../../utils/getOnyxValue';
import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

jest.mock('@pages/SimplifiedBankOnboarding/core/accountRead/openOnboardingPage', () => ({
    __esModule: true,
    default: jest.fn(),
    getAccountLoadingData: jest.fn(() => ({})),
}));

jest.mock('@libs/Navigation/Navigation', () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setParams: jest.fn(),
    dismissModal: jest.fn(),
}));

jest.mock('@hooks/useNetwork', () => jest.fn(() => ({isOffline: false})));

jest.mock('@hooks/useLocalize', () => jest.fn(() => ({translate: (key: string) => key})));

// The views of the gate are stand-ins with a test ID, because the test checks which view the gate picks, not how it looks
jest.mock('@components/FullscreenLoadingIndicator', () => {
    const RN = jest.requireActual<typeof ReactNative>('react-native');
    return () => <RN.View testID="FullScreenLoadingIndicator" />;
});
jest.mock('@pages/ErrorPage/NotFoundPage', () => {
    const RN = jest.requireActual<typeof ReactNative>('react-native');
    return () => <RN.View testID="NotFoundPage" />;
});
jest.mock('@components/ScreenWrapper', () => {
    const RN = jest.requireActual<typeof ReactNative>('react-native');
    return ({testID}: {testID: string}) => <RN.View testID={testID} />;
});

const POLICY_ID = '1';
const OTHER_POLICY_ID = '2';
const USD_TARGET: FlowTarget = {
    kind: 'usd',
    policyID: POLICY_ID,
    backTo: undefined,
};
const SUCCEEDED: RequestOutcome = {status: 'succeeded'};
const FAILED: RequestOutcome = {status: 'failed'};
const ACCOUNT_OF_WORKSPACE: OnboardingAccount = {
    achData: {policyID: POLICY_ID, bankAccountID: 5},
};

/** Every test step shows its ID, so a test sees which step the flow renders */
function ShownStep() {
    const {step} = useFlowStepPosition();
    return <Text>{`Step ${step}`}</Text>;
}

type FlowOptions = {
    target?: FlowTarget;
    urlStep?: StepID;
    resumeAt?: StepID;
    isBankAccountSkipped?: boolean;
};

async function renderFlow({target = USD_TARGET, urlStep, resumeAt, isBankAccountSkipped = false}: FlowOptions = {}) {
    render(
        <OnboardingFlow
            target={target}
            params={{page: urlStep}}
            resumeAt={resumeAt}
        >
            <FlowStep
                id="country"
                component={ShownStep}
            />
            <FlowStep
                id="bank-account"
                component={ShownStep}
                skip={isBankAccountSkipped}
            />
            <FlowStep
                id="personal-info"
                component={ShownStep}
            />
        </OnboardingFlow>,
    );
    await waitForBatchedUpdatesWithAct();
}

async function setAccount(account: OnboardingAccount) {
    await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, account);
    await waitForBatchedUpdatesWithAct();
}

/** The read of the mock answers with the account of the route's workspace, as the server does */
function answerReadWithWorkspaceAccount() {
    jest.mocked(openOnboardingPage).mockImplementation(() => Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, ACCOUNT_OF_WORKSPACE).then(() => SUCCEEDED));
}

describe('OnboardingFlow', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.mocked(useNetwork).mockReturnValue({isOffline: false});
        answerReadWithWorkspaceAccount();
        await Onyx.clear();
        await waitForBatchedUpdatesWithAct();
    });

    describe('the account gate', () => {
        it('does not read during a reset', async () => {
            // Given a reset of the bank account that has removed the account data and still runs
            await setAccount({
                pendingAction: CONST.RED_BRICK_ROAD_PENDING_ACTION.DELETE,
            });

            // When the flow opens
            await renderFlow({urlStep: 'country'});

            // Then the flow shows its step without a read, so the read does not bring back the data the reset removes
            expect(openOnboardingPage).not.toHaveBeenCalled();
            expect(screen.getByText('Step country')).toBeOnTheScreen();
        });

        it('does not read without a policyID', async () => {
            // Given a route without a workspace and no account in Onyx
            // When the flow opens
            await renderFlow({
                target: {kind: 'usd', policyID: undefined, backTo: undefined},
                urlStep: 'country',
            });

            // Then nothing is read, because a read needs the workspace
            expect(openOnboardingPage).not.toHaveBeenCalled();
            expect(screen.getByText('Step country')).toBeOnTheScreen();
        });

        it('clears the draft before it reads the account of another workspace', async () => {
            // Given the account and the draft of another workspace in Onyx
            await setAccount({
                achData: {policyID: OTHER_POLICY_ID, bankAccountID: 9},
            });
            await Onyx.set(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT, {
                firstName: 'Ada',
            });
            let draftAtRead: OnboardingDraft | null | undefined;
            jest.mocked(openOnboardingPage).mockImplementation(() =>
                getOnyxValue(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT)
                    .then((draft) => {
                        draftAtRead = draft;
                        return Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, ACCOUNT_OF_WORKSPACE);
                    })
                    .then(() => SUCCEEDED),
            );

            // When the flow of this workspace opens
            await renderFlow({urlStep: 'country'});

            // Then the draft is gone when the read starts, so no answer of the other workspace leaks into this one
            expect(openOnboardingPage).toHaveBeenCalledWith({policyID: POLICY_ID});
            expect(draftAtRead?.firstName).toBeUndefined();
            expect(screen.getByText('Step country')).toBeOnTheScreen();
        });

        it('reads the account when Onyx holds an account that names no workspace', async () => {
            // Given the empty account that the entry leaves behind when it closes
            await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, DEFAULT_ACCOUNT);

            // When the flow of a workspace opens, for example from a deep link
            await renderFlow({urlStep: 'country'});

            // Then the account of the workspace is read, because the empty account says nothing about the setup that the server holds
            expect(openOnboardingPage).toHaveBeenCalledWith({policyID: POLICY_ID});
            expect(screen.getByText('Step country')).toBeOnTheScreen();
        });

        it('shows the loader while the account is read', async () => {
            // Given no account in Onyx and a read that has not answered yet
            jest.mocked(openOnboardingPage).mockImplementation(() => new Promise<RequestOutcome>(() => {}));

            // When the flow opens
            await renderFlow({urlStep: 'country'});

            // Then the loader stands in for the step, which would otherwise render without its data
            expect(screen.getByTestId('FullScreenLoadingIndicator')).toBeOnTheScreen();
            expect(screen.queryByText('Step country')).not.toBeOnTheScreen();
        });

        it('shows the offline view when the account cannot be read', async () => {
            // Given no account in Onyx and no connection
            jest.mocked(useNetwork).mockReturnValue({isOffline: true});

            // When the flow opens
            await renderFlow({urlStep: 'country'});

            // Then the offline view is shown and nothing is sent until the app reconnects
            expect(screen.getByTestId('SimplifiedBankOnboardingAccountGateOffline')).toBeOnTheScreen();
            expect(openOnboardingPage).not.toHaveBeenCalled();
        });

        it('shows NotFoundPage when the read fails', async () => {
            // Given no account in Onyx and a read that fails
            jest.mocked(openOnboardingPage).mockResolvedValue(FAILED);

            // When the flow opens
            await renderFlow({urlStep: 'country'});

            // Then the flow does not open on data it could not read
            expect(screen.getByTestId('NotFoundPage')).toBeOnTheScreen();
        });
    });

    describe('the step of the URL', () => {
        beforeEach(async () => {
            await setAccount(ACCOUNT_OF_WORKSPACE);
        });

        it('renders the step that the URL names', async () => {
            // Given the account of the workspace in Onyx
            // When the URL names a step of the flow
            await renderFlow({urlStep: 'bank-account'});

            // Then that step renders and the route stays as it is
            expect(screen.getByText('Step bank-account')).toBeOnTheScreen();
            expect(Navigation.navigate).not.toHaveBeenCalled();
        });

        it('replaces a missing step with the resume step', async () => {
            // Given a URL without a step and a server that names where the user stopped
            // When the flow opens
            await renderFlow({resumeAt: 'personal-info'});

            // Then the route is replaced with the resume step and no step renders before the replace lands
            expect(Navigation.navigate).toHaveBeenCalledWith(getFlowRoute(USD_TARGET, {step: 'personal-info'}), {forceReplace: true});
            expect(screen.queryByText(/^Step /)).not.toBeOnTheScreen();
        });

        it('replaces a skipped step with the next step that is not skipped', async () => {
            // Given a URL that names a step this account skips
            // When the flow opens
            await renderFlow({urlStep: 'bank-account', isBankAccountSkipped: true});

            // Then the route is replaced with the next step, so Back never lands on the skipped one
            expect(Navigation.navigate).toHaveBeenCalledWith(getFlowRoute(USD_TARGET, {step: 'personal-info'}), {forceReplace: true});
        });
    });
});
