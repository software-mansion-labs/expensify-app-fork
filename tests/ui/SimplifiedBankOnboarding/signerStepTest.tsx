import {fireEvent, screen} from '@testing-library/react-native';

import type InteractiveStepWrapperModule from '@components/InteractiveStepWrapper';

import Navigation from '@libs/Navigation/Navigation';

import type {PageID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type {FlowStepPosition, FlowTarget} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import {getFlowRoute} from '@pages/SimplifiedBankOnboarding/core/flow/flowRoutes';
import type {FlowNavigationState} from '@pages/SimplifiedBankOnboarding/core/flow/flowRoutes';
import PAGES from '@pages/SimplifiedBankOnboarding/flows/nonUSD/signer/signerPages';
import SignerStep from '@pages/SimplifiedBankOnboarding/flows/nonUSD/signer/SignerStep';

import ONYXKEYS from '@src/ONYXKEYS';

import type * as NativeNavigation from '@react-navigation/native';
import type ReactNative from 'react-native';

import React from 'react';
import Onyx from 'react-native-onyx';

import {createTestFlowActions, renderInFlow} from '../../utils/BankOnboardingLabStepTestUtils';
import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

const POLICY_ID = '1';
const TARGET: FlowTarget = {kind: 'nonUSD', policyID: POLICY_ID, backTo: undefined};
const {PAGE_NAMES, CURRENT_USER_KEY} = SBO_CONST.NON_USD;

const mockNavigationState: FlowNavigationState = {routes: []};

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<typeof NativeNavigation>('@react-navigation/native'),
    useIsFocused: () => true,
    useRoute: () => ({key: 'current-route', name: 'CurrentScreen'}),
    useNavigation: () => ({getState: () => mockNavigationState, isFocused: () => true, addListener: () => () => {}}),
    useNavigationState: <TResult,>(selector: (state: FlowNavigationState) => TResult) => selector(mockNavigationState),
}));

jest.mock('@libs/Navigation/Navigation', () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setParams: jest.fn(),
    dismissModal: jest.fn(),
}));

jest.mock('@hooks/useLocalize', () => jest.fn(() => ({translate: (key: string) => key})));

// The real wrapper needs the whole screen stack, and the step only gives it its content and Back.
jest.mock('@components/InteractiveStepWrapper', () => {
    const RN = jest.requireActual<typeof ReactNative>('react-native');
    return ({children, handleBackButtonPress}: React.ComponentProps<typeof InteractiveStepWrapperModule>) => (
        <RN.View>
            <RN.Pressable onPress={handleBackButtonPress}>
                <RN.Text>test-back</RN.Text>
            </RN.Pressable>
            {children}
        </RN.View>
    );
});

const flowActions = createTestFlowActions();
const {saveDraft} = flowActions;

async function renderSignerStep(page: PageID | undefined) {
    const position: FlowStepPosition = {
        step: PAGE_NAMES.SIGNER_INFO,
        previousStep: PAGE_NAMES.BENEFICIAL_OWNER_INFO,
        nextStep: PAGE_NAMES.AGREEMENTS,
        counterIndex: 4,
        counterNames: [],
        page,
        isEditing: false,
    };

    await renderInFlow(<SignerStep />, {target: TARGET, position, flowActions});
}

async function answerDirectorQuestion(label: 'common.yes' | 'common.no') {
    fireEvent.press(screen.getByText(label));
    fireEvent.press(screen.getByText('common.confirm'));
    await waitForBatchedUpdatesWithAct();
}

function getSignerRoute(page: PageID) {
    return getFlowRoute(TARGET, {step: PAGE_NAMES.SIGNER_INFO, page});
}

describe('SignerStep', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        await Onyx.clear();
        await waitForBatchedUpdatesWithAct();
    });

    it('opens the name page after "Yes"', async () => {
        // Given a user who is not an owner on the director question
        await renderSignerStep(PAGES.IS_DIRECTOR);

        // When the user answers "Yes"
        await answerDirectorQuestion('common.yes');

        // Then the answer reaches the draft and the name page opens
        expect(saveDraft).toHaveBeenCalledWith({isUserDirector: true});
        expect(Navigation.navigate).toHaveBeenCalledWith(getSignerRoute(PAGES.NAME));
    });

    it('opens the job title page after "Yes" when the owner step holds the name', async () => {
        // Given a user who gave their name as an owner in the previous step
        await Onyx.set(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT, {
            ownsMoreThan25Percent: true,
            globalOwners: [{id: CURRENT_USER_KEY, firstName: 'Owner', lastName: 'Name', ownershipPercentage: '50'}],
        });
        await renderSignerStep(PAGES.IS_DIRECTOR);

        // When the user answers "Yes"
        await answerDirectorQuestion('common.yes');

        // Then the name page is left out and the job title page opens
        expect(Navigation.navigate).toHaveBeenCalledWith(getSignerRoute(PAGES.JOB_TITLE));
    });

    it('opens the email page after "No"', async () => {
        // Given a user on the director question
        await renderSignerStep(PAGES.IS_DIRECTOR);

        // When the user answers "No"
        await answerDirectorQuestion('common.no');

        // Then the answer reaches the draft and the email page opens, because another director has to be invited
        expect(saveDraft).toHaveBeenCalledWith({isUserDirector: false});
        expect(Navigation.navigate).toHaveBeenCalledWith(getSignerRoute(PAGES.ENTER_EMAIL));
    });

    it('opens the waiting page when the URL names no sub page and a director was invited', async () => {
        // Given a server that holds the email of an invited director and no director name
        await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {achData: {policyID: POLICY_ID, corpay: {signerEmail: 'director@example.com'}}});

        // When the step opens without a sub page in the URL
        await renderSignerStep(undefined);

        // Then the computed start page is shown at once and written to the URL, never the skipped name page
        expect(screen.getByText('signerInfoStep.hangTight')).toBeOnTheScreen();
        expect(Navigation.setParams).toHaveBeenCalledWith({subPage: PAGES.HANG_TIGHT}, 'current-route');
    });

    it('goes back to the owners step from the waiting page', async () => {
        // Given a user on the waiting page after inviting a director from the email page
        await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {achData: {policyID: POLICY_ID, corpay: {signerEmail: 'director@example.com'}}});
        await renderSignerStep(PAGES.HANG_TIGHT);

        // When the user presses Back
        fireEvent.press(screen.getByText('test-back'));

        // Then the previous step opens rather than the email page, because the invitation was already sent
        expect(Navigation.goBack).toHaveBeenCalledWith(getFlowRoute(TARGET, {step: PAGE_NAMES.BENEFICIAL_OWNER_INFO}));
    });

    it('shows the name page before the draft holds the "Yes" answer', async () => {
        // Given the URL that "Yes" opened, and a draft that does not hold the answer yet, as when the step renders the
        // new URL before Onyx delivers the draft
        // When the step renders
        await renderSignerStep(PAGES.NAME);

        // Then the name page is shown and the step does not redirect to its start page, because the detail pages do
        // not depend on an answer of the same step
        expect(screen.getByText('signerInfoStep.whatsYourName')).toBeOnTheScreen();
        expect(Navigation.setParams).not.toHaveBeenCalled();
    });

    it('shows the job title page before the draft holds the "Yes" answer', async () => {
        // Given an owner on the URL that "Yes" opened, before the draft holds the answer
        await Onyx.set(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT, {
            ownsMoreThan25Percent: true,
            globalOwners: [{id: CURRENT_USER_KEY, firstName: 'Owner', lastName: 'Name', ownershipPercentage: '50'}],
        });

        // When the step renders
        await renderSignerStep(PAGES.JOB_TITLE);

        // Then the job title page is shown without a redirect
        expect(screen.getByText('signerInfoStep.whatsYourJobTitle')).toBeOnTheScreen();
        expect(Navigation.setParams).not.toHaveBeenCalled();
    });
});
