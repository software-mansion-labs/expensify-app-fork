import {render, screen} from '@testing-library/react-native';

import Text from '@components/Text';

import useNetwork from '@hooks/useNetwork';

import Navigation from '@libs/Navigation/Navigation';

import {DEFAULT_ACCOUNT} from '@pages/SimplifiedBankOnboarding/contract/defaultAccount';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {PageID, StepID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import type {OnboardingAccount} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import openOnboardingPage from '@pages/SimplifiedBankOnboarding/core/accountRead/openOnboardingPage';
import {useFlowStepPosition} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import type {FlowTarget} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import FlowStep from '@pages/SimplifiedBankOnboarding/core/flow/FlowStep';
import OnboardingFlow from '@pages/SimplifiedBankOnboarding/core/flow/OnboardingFlow';
import type {RequestOutcome} from '@pages/SimplifiedBankOnboarding/core/requests/types';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import type * as NativeNavigation from '@react-navigation/native';
import type ReactNative from 'react-native';

import React, {useState} from 'react';
import Onyx from 'react-native-onyx';

import getOnyxValue from '../../utils/getOnyxValue';
import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

jest.mock('@pages/SimplifiedBankOnboarding/core/accountRead/openOnboardingPage', () => ({
    __esModule: true,
    default: jest.fn(),
    getAccountLoadingData: jest.fn(() => ({})),
}));

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<typeof NativeNavigation>('@react-navigation/native'),
    useRoute: () => ({key: 'flow-route', name: 'FlowScreen'}),
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

/** Every test step shows what the flow gives it, so a test sees which step renders and at which position */
function ShownStep() {
    const {step, previousStep, nextStep, page, isEditing, editReturnPage, stepToWrite} = useFlowStepPosition();
    const [mountedStep] = useState(step);
    return (
        <>
            <Text>{`Step ${step}`}</Text>
            <Text>{`Mounted at ${mountedStep}`}</Text>
            <Text>{`Page ${page ?? 'none'}, editing ${String(isEditing)}, returning to ${editReturnPage ?? 'none'}`}</Text>
            <Text>{`Previous ${previousStep ?? 'none'}, next ${nextStep ?? 'none'}`}</Text>
            <Text>{`Step to write ${stepToWrite ?? 'none'}`}</Text>
        </>
    );
}

type FlowOptions = {
    target?: FlowTarget;
    urlStep?: string;
    urlPage?: PageID;
    isEditing?: boolean;
    editReturnPage?: PageID;
    completeSteps?: StepID[];
    isBankAccountSkipped?: boolean;
};

function getFlow({target = USD_TARGET, urlStep, urlPage, isEditing = false, editReturnPage, completeSteps = [], isBankAccountSkipped = false}: FlowOptions = {}) {
    return (
        <OnboardingFlow
            target={target}
            params={{page: urlStep, subPage: urlPage, action: isEditing ? 'edit' : undefined, returnTo: editReturnPage}}
        >
            <FlowStep
                id="country"
                isComplete={completeSteps.includes('country')}
            >
                <ShownStep />
            </FlowStep>
            <FlowStep
                id="bank-account"
                isComplete={completeSteps.includes('bank-account')}
                skip={isBankAccountSkipped}
            >
                <ShownStep />
            </FlowStep>
            <FlowStep
                id="personal-info"
                isComplete={completeSteps.includes('personal-info')}
            >
                <ShownStep />
            </FlowStep>
        </OnboardingFlow>
    );
}

async function renderFlow(options?: FlowOptions) {
    const view = render(getFlow(options));
    await waitForBatchedUpdatesWithAct();
    return view;
}

/** The flow writes nothing itself. It hands the step to the step shell, which writes it with its start page in one write. */
function expectURLCorrectedTo(step: StepID) {
    expect(screen.getByText(`Step to write ${step}`)).toBeOnTheScreen();
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

        it('mounts a new step when the URL opens another step that renders the same component', async () => {
            // Given a shown step whose component is also the component of the next step
            const {rerender} = await renderFlow({urlStep: 'country'});
            expect(screen.getByText('Mounted at country')).toBeOnTheScreen();

            // When the URL opens the next step
            rerender(getFlow({urlStep: 'bank-account'}));
            await waitForBatchedUpdatesWithAct();

            // Then the next step starts with its own state, because the state of a step must not leak into the next one
            expect(screen.getByText('Mounted at bank-account')).toBeOnTheScreen();
        });

        it('keeps the sub page and the edit mode of a URL whose step is shown', async () => {
            // Given the account of the workspace in Onyx
            // When the URL names a step, a sub page, the edit mode and the page that opened it
            await renderFlow({urlStep: 'bank-account', urlPage: 'manual', isEditing: true, editReturnPage: 'plaid'});

            // Then the step gets all of them, and nothing is written to the URL
            expect(screen.getByText('Page manual, editing true, returning to plaid')).toBeOnTheScreen();
            expect(screen.getByText('Step to write none')).toBeOnTheScreen();
            expect(Navigation.setParams).not.toHaveBeenCalled();
        });

        it('shows the first step that is not complete for a URL without a step, in the same render', async () => {
            // Given a URL without a step and a setup whose first two steps are complete
            // When the flow opens
            await renderFlow({completeSteps: ['country', 'bank-account']});

            // Then the step renders at once and the URL is corrected in place, so no route is added or replaced
            expect(screen.getByText('Step personal-info')).toBeOnTheScreen();
            expectURLCorrectedTo('personal-info');
            expect(Navigation.navigate).not.toHaveBeenCalled();
        });

        it('shows the first step of a new setup for a URL with an unknown step', async () => {
            // Given a URL whose step is no step of any flow, and a setup with no complete step
            // When the flow opens
            await renderFlow({urlStep: 'no-such-step'});

            // Then the unknown step counts as missing
            expect(screen.getByText('Step country')).toBeOnTheScreen();
            expectURLCorrectedTo('country');
        });

        it('shows the next step that is not skipped for a skipped step in the URL', async () => {
            // Given a URL that names a step this account skips, with a sub page and the edit mode of that step
            // When the flow opens
            await renderFlow({urlStep: 'bank-account', urlPage: 'manual', isEditing: true, editReturnPage: 'plaid', isBankAccountSkipped: true});

            // Then the next step renders without the sub page and the edit mode, which belonged to the skipped step
            expect(screen.getByText('Step personal-info')).toBeOnTheScreen();
            expect(screen.getByText('Page none, editing false, returning to none')).toBeOnTheScreen();
            expectURLCorrectedTo('personal-info');
            expect(Navigation.navigate).not.toHaveBeenCalled();
        });

        it('moves on in place when the shown step becomes skipped', async () => {
            // Given a shown step
            const {rerender} = await renderFlow({urlStep: 'bank-account'});
            expect(screen.getByText('Step bank-account')).toBeOnTheScreen();

            // When an answer of the server makes the flow skip that step
            rerender(getFlow({urlStep: 'bank-account', isBankAccountSkipped: true}));
            await waitForBatchedUpdatesWithAct();

            // Then the next step takes its place on the same route
            expect(screen.getByText('Step personal-info')).toBeOnTheScreen();
            expectURLCorrectedTo('personal-info');
        });

        it('names the next step of the list for Next and the step before the skipped one for Back', async () => {
            // Given a flow whose middle step is skipped
            // When the first and the last step render
            const {rerender} = await renderFlow({urlStep: 'country', isBankAccountSkipped: true});
            const positionOfFirstStep = screen.getByText('Previous none, next bank-account');
            rerender(getFlow({urlStep: 'personal-info', isBankAccountSkipped: true}));
            await waitForBatchedUpdatesWithAct();

            // Then Next of the first step opens the URL of the skipped step, which the flow resolves with the data of
            // that moment, and Back of the last step passes over the skipped step
            expect(positionOfFirstStep).toBeTruthy();
            expect(screen.getByText('Previous country, next none')).toBeOnTheScreen();
        });

        it('does not correct the URL before the account gate opens', async () => {
            // Given no account in Onyx and a read that has not answered yet
            await Onyx.clear();
            jest.mocked(openOnboardingPage).mockImplementation(() => new Promise<RequestOutcome>(() => {}));

            // When the flow opens without a step
            await renderFlow();

            // Then the URL stays as it is, because the step to resume at is not known before the account is read
            expect(Navigation.setParams).not.toHaveBeenCalled();
        });
    });
});
