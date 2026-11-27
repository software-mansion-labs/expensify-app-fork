import {fireEvent, screen} from '@testing-library/react-native';

import type InteractiveStepWrapperModule from '@components/InteractiveStepWrapper';

import Navigation from '@libs/Navigation/Navigation';

import type {GlobalOwnerDraft, OnboardingDraft, USDOwnerDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {PageID, StepID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import type {OnboardingAccount} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type {FlowStepPosition, FlowTarget} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import {getFlowRoute} from '@pages/SimplifiedBankOnboarding/core/flow/flowRoutes';
import type {FlowNavigationState} from '@pages/SimplifiedBankOnboarding/core/flow/flowRoutes';
import {clearRequestState} from '@pages/SimplifiedBankOnboarding/core/requests/runRequest';
import NonUSDBeneficialOwnersStep from '@pages/SimplifiedBankOnboarding/flows/nonUSD/beneficialOwners/BeneficialOwnersStep';
import NON_USD_PAGES from '@pages/SimplifiedBankOnboarding/flows/nonUSD/beneficialOwners/ownersPages';
import {EMPTY_OWNER_BUFFER, GLOBAL_OWNER_BUFFER, USD_OWNER_BUFFER} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/ownerBuffer';
import {CURRENT_USER_OWNER_ID} from '@pages/SimplifiedBankOnboarding/flows/shared/owners/ownerList';
import USDBeneficialOwnersStep from '@pages/SimplifiedBankOnboarding/flows/usd/beneficialOwners/BeneficialOwnersStep';
import USD_PAGES from '@pages/SimplifiedBankOnboarding/flows/usd/beneficialOwners/ownersPages';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {write} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';

import ONYXKEYS from '@src/ONYXKEYS';
import SCREENS from '@src/SCREENS';

import type * as NativeNavigation from '@react-navigation/native';
import type ReactNative from 'react-native';

import React from 'react';
import Onyx from 'react-native-onyx';

import {answerWrites, createTestFlowActions, renderInFlow} from '../../utils/BankOnboardingLabStepTestUtils';
import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

const ROUTE_KEY = 'current-route';
const POLICY_ID = '1';
const USD_TARGET: FlowTarget = {
    kind: 'usd',
    policyID: POLICY_ID,
    backTo: undefined,
};
const NON_USD_TARGET: FlowTarget = {
    kind: 'nonUSD',
    policyID: POLICY_ID,
    backTo: undefined,
};
const {PAGE_NAMES: USD_STEPS} = SBO_CONST.USD;
const {PAGE_NAMES: NON_USD_STEPS} = SBO_CONST.NON_USD;

let mockNavigationState: FlowNavigationState = {routes: []};

jest.mock('@react-navigation/native', () => ({
    ...jest.requireActual<typeof NativeNavigation>('@react-navigation/native'),
    useIsFocused: () => true,
    useRoute: () => ({key: 'current-route', name: 'CurrentScreen'}),
    useNavigation: () => ({
        getState: () => mockNavigationState,
        isFocused: () => true,
        addListener: () => () => {},
    }),
    useNavigationState: <TResult,>(selector: (state: FlowNavigationState) => TResult) => selector(mockNavigationState),
}));

jest.mock('@libs/Navigation/Navigation', () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setParams: jest.fn(),
    dismissModal: jest.fn(),
}));

jest.mock('@pages/SimplifiedBankOnboarding/mockBackend/mockApi', () => ({
    read: jest.fn(),
    write: jest.fn(),
}));

jest.mock('@hooks/useLocalize', () => jest.fn(() => ({translate: (key: string) => key})));

// The real wrapper needs the whole screen stack. The test keeps the two inputs that the step drives: the content and Back.
jest.mock('@components/InteractiveStepWrapper', () => {
    const RN = jest.requireActual<typeof ReactNative>('react-native');
    return ({children, handleBackButtonPress}: React.ComponentProps<typeof InteractiveStepWrapperModule>) => (
        <RN.View>
            <RN.Pressable
                accessibilityRole="button"
                accessibilityLabel="Back"
                onPress={handleBackButtonPress}
            />
            {children}
        </RN.View>
    );
});

/** A new owner gets a random ID, so the tests only check that there is one */
const ANY_NEW_OWNER_ID: unknown = expect.any(String);

const ADA: USDOwnerDraft = {
    id: 'ada',
    firstName: 'Ada',
    lastName: 'Lovelace',
    dob: '1990-01-01',
};
const ALAN: USDOwnerDraft = {
    id: 'alan',
    firstName: 'Alan',
    lastName: 'Turing',
    dob: '1991-02-02',
};
const GRACE: USDOwnerDraft = {
    id: 'grace',
    firstName: 'Grace',
    lastName: 'Hopper',
    dob: '1992-03-03',
};

function createGlobalOwner(id: string, ownershipPercentage: string): GlobalOwnerDraft {
    return {
        id,
        firstName: `First ${id}`,
        lastName: `Last ${id}`,
        ownershipPercentage,
    };
}

const flowActions = createTestFlowActions();
const {saveDraft} = flowActions;

type StepSetup = {
    target: FlowTarget;
    step: StepID;
    previousStep: StepID;
    nextStep: StepID;
    element: React.ReactElement;
};

const USD_STEP: StepSetup = {
    target: USD_TARGET,
    step: USD_STEPS.BENEFICIAL_OWNERS,
    previousStep: USD_STEPS.COMPANY,
    nextStep: USD_STEPS.ACH_CONTRACT,
    element: <USDBeneficialOwnersStep />,
};

const NON_USD_STEP: StepSetup = {
    target: NON_USD_TARGET,
    step: NON_USD_STEPS.BENEFICIAL_OWNER_INFO,
    previousStep: NON_USD_STEPS.BUSINESS_INFO,
    nextStep: NON_USD_STEPS.SIGNER_INFO,
    element: <NonUSDBeneficialOwnersStep />,
};

async function setUp(draft: OnboardingDraft, account?: OnboardingAccount) {
    await Onyx.set(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT, draft);
    await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, account ?? {achData: {policyID: POLICY_ID}});
    await waitForBatchedUpdatesWithAct();
}

async function renderStep({target, step, previousStep, nextStep, element}: StepSetup, page: PageID | undefined) {
    const position: FlowStepPosition = {
        step,
        previousStep,
        nextStep,
        counterIndex: 3,
        counterNames: [],
        page,
        isEditing: false,
    };

    await renderInFlow(element, {target, position, flowActions});
}

async function answer(label: 'common.yes' | 'common.no') {
    fireEvent.press(screen.getByText(label));
    fireEvent.press(screen.getByText('common.confirm'));
    await waitForBatchedUpdatesWithAct();
}

async function confirm() {
    fireEvent.press(screen.getByText('common.confirm'));
    await waitForBatchedUpdatesWithAct();
}

async function pressBack() {
    fireEvent.press(screen.getByLabelText('Back'));
    await waitForBatchedUpdatesWithAct();
}

function getUSDRoute(page?: PageID) {
    return getFlowRoute(USD_TARGET, {step: USD_STEPS.BENEFICIAL_OWNERS, page});
}

function getNonUSDRoute(page?: PageID) {
    return getFlowRoute(NON_USD_TARGET, {
        step: NON_USD_STEPS.BENEFICIAL_OWNER_INFO,
        page,
    });
}

/** The draft of an owner in the buffer, as a question or a row press leaves it */
function getUSDBufferDraft(owner: USDOwnerDraft): OnboardingDraft {
    return {
        ownerBeingModifiedID: owner.id,
        ...USD_OWNER_BUFFER.getBuffer(owner),
    };
}

function getGlobalBufferDraft(owner: GlobalOwnerDraft): OnboardingDraft {
    return {
        ownerBeingModifiedID: owner.id,
        ...GLOBAL_OWNER_BUFFER.getBuffer(owner),
    };
}

describe('owner steps', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.mocked(write).mockReset();
        mockNavigationState = {routes: []};
        await clearRequestState();
        await Onyx.clear();
        await waitForBatchedUpdatesWithAct();
    });

    describe('USD', () => {
        it('drops the last of three owners when the user owns 25%, then asks about the others', async () => {
            // Given three other owners
            await setUp({
                usdOwners: [ADA, ALAN, GRACE],
                hasOtherBeneficialOwners: true,
            });
            await renderStep(USD_STEP, USD_PAGES.IS_USER_UBO);

            // When the user says they own 25%
            await answer('common.yes');

            // Then the last owner leaves, because the user takes one of the three places, and the second question opens (USD-74)
            expect(saveDraft).toHaveBeenCalledWith({
                ownsMoreThan25Percent: true,
                usdOwners: [ADA, ALAN],
            });
            expect(Navigation.navigate).toHaveBeenCalledWith(getUSDRoute(USD_PAGES.IS_ANYONE_ELSE_UBO));
        });

        it('starts a new owner when someone else owns 25% and a place is free', async () => {
            // Given a user who owns 25% next to one other owner
            await setUp({ownsMoreThan25Percent: true, usdOwners: [ADA]});
            await renderStep(USD_STEP, USD_PAGES.IS_ANYONE_ELSE_UBO);

            // When the user says someone else owns 25%
            await answer('common.yes');

            // Then an empty owner with a new ID is in the buffer and its name page opens (USD-75)
            expect(saveDraft).toHaveBeenCalledWith({
                hasOtherBeneficialOwners: true,
                ownerBeingModifiedID: ANY_NEW_OWNER_ID,
                ...EMPTY_OWNER_BUFFER,
            });
            expect(Navigation.navigate).toHaveBeenCalledWith(getUSDRoute(USD_PAGES.LEGAL_NAME));
        });

        it('opens the list when someone else owns 25% but no place is free', async () => {
            // Given a user who owns 25% next to two other owners
            await setUp({ownsMoreThan25Percent: true, usdOwners: [ADA, ALAN]});
            await renderStep(USD_STEP, USD_PAGES.IS_ANYONE_ELSE_UBO);

            // When the user says someone else owns 25%
            await answer('common.yes');

            // Then no owner starts and the list opens (USD-75)
            expect(saveDraft).toHaveBeenCalledWith({
                hasOtherBeneficialOwners: true,
            });
            expect(Navigation.navigate).toHaveBeenCalledWith(getUSDRoute(USD_PAGES.UBOS_LIST));
        });

        it('sends no owners at once when nobody owns 25%', async () => {
            // Given a user who does not own 25%, and an owner left in the draft by an earlier "yes"
            answerWrites('success');
            await setUp({ownsMoreThan25Percent: false, usdOwners: [ADA]});
            await renderStep(USD_STEP, USD_PAGES.IS_ANYONE_ELSE_UBO);

            // When the user says nobody else owns 25%
            await answer('common.no');

            // Then the request goes out with no owners and the next step opens (USD-80)
            expect(write).toHaveBeenCalledWith(
                WRITE_COMMANDS.UPDATE_BENEFICIAL_OWNERS,
                expect.objectContaining({
                    ownsMoreThan25Percent: false,
                    beneficialOwners: '[]',
                    beneficialOwnerKeys: [],
                }),
                expect.anything(),
            );
            expect(Navigation.navigate).toHaveBeenCalledWith(getFlowRoute(USD_TARGET, {step: USD_STEPS.ACH_CONTRACT}));
        });

        it('opens the list when only the user owns 25%', async () => {
            // Given a user who owns 25%
            await setUp({ownsMoreThan25Percent: true});
            await renderStep(USD_STEP, USD_PAGES.IS_ANYONE_ELSE_UBO);

            // When the user says nobody else owns 25%
            await answer('common.no');

            // Then nothing is sent yet and the list opens with the user's row (USD-75)
            expect(write).not.toHaveBeenCalled();
            expect(Navigation.navigate).toHaveBeenCalledWith(getUSDRoute(USD_PAGES.UBOS_LIST));
        });

        it('opens the list when nobody more owns 25% without undoing the earlier "yes"', async () => {
            // Given one other owner
            await setUp({hasOtherBeneficialOwners: true, usdOwners: [ADA]});
            await renderStep(USD_STEP, USD_PAGES.ARE_THERE_MORE_UBOS);

            // When the user says nobody more owns 25%
            await answer('common.no');

            // Then the list opens and nothing is saved, so the second question keeps its "yes" (USD-76)
            expect(saveDraft).toHaveBeenCalledWith({});
            expect(Navigation.navigate).toHaveBeenCalledWith(getUSDRoute(USD_PAGES.UBOS_LIST));
        });

        it('starts another owner when there are more', async () => {
            // Given one other owner
            await setUp({hasOtherBeneficialOwners: true, usdOwners: [ADA]});
            await renderStep(USD_STEP, USD_PAGES.ARE_THERE_MORE_UBOS);

            // When the user says more people own 25%
            await answer('common.yes');

            // Then a new owner starts on its name page (USD-76)
            expect(saveDraft).toHaveBeenCalledWith({
                ownerBeingModifiedID: ANY_NEW_OWNER_ID,
                ...EMPTY_OWNER_BUFFER,
            });
            expect(Navigation.navigate).toHaveBeenCalledWith(getUSDRoute(USD_PAGES.LEGAL_NAME));
        });

        it('opens the list when there are more but no place is free', async () => {
            // Given a user who owns 25% next to two other owners, reached "are there more" again through the browser history
            await setUp({
                ownsMoreThan25Percent: true,
                hasOtherBeneficialOwners: true,
                usdOwners: [ADA, ALAN],
            });
            await renderStep(USD_STEP, USD_PAGES.ARE_THERE_MORE_UBOS);

            // When the user says more people own 25%
            await answer('common.yes');

            // Then no owner starts, because the confirmation could not add one, and the list opens
            expect(saveDraft).toHaveBeenCalledWith({});
            expect(Navigation.navigate).toHaveBeenCalledWith(getUSDRoute(USD_PAGES.UBOS_LIST));
        });

        it('adds a new owner and asks for more while a place is free', async () => {
            // Given a new owner in the buffer next to one listed owner
            await setUp({
                hasOtherBeneficialOwners: true,
                usdOwners: [ADA],
                ...getUSDBufferDraft(ALAN),
            });
            await renderStep(USD_STEP, USD_PAGES.CONFIRMATION);

            // When the user confirms the owner
            await confirm();

            // Then the owner joins the list and "are there more" opens (USD-77)
            expect(saveDraft).toHaveBeenCalledWith({usdOwners: [ADA, ALAN]});
            expect(Navigation.navigate).toHaveBeenCalledWith(getUSDRoute(USD_PAGES.ARE_THERE_MORE_UBOS));
        });

        it('opens the list after the owner who took the last place', async () => {
            // Given a user who owns 25%, one listed owner, and a new owner in the buffer
            await setUp({
                ownsMoreThan25Percent: true,
                hasOtherBeneficialOwners: true,
                usdOwners: [ADA],
                ...getUSDBufferDraft(ALAN),
            });
            await renderStep(USD_STEP, USD_PAGES.CONFIRMATION);

            // When the user confirms the owner
            await confirm();

            // Then the list opens, because nobody else fits (USD-77)
            expect(saveDraft).toHaveBeenCalledWith({usdOwners: [ADA, ALAN]});
            expect(Navigation.navigate).toHaveBeenCalledWith(getUSDRoute(USD_PAGES.UBOS_LIST));
        });

        it('returns an owner opened from the list to the list', async () => {
            // Given the first of two listed owners in the buffer, as after a row press
            await setUp({
                hasOtherBeneficialOwners: true,
                usdOwners: [ADA, ALAN],
                ...getUSDBufferDraft(ADA),
            });
            await renderStep(USD_STEP, USD_PAGES.CONFIRMATION);

            // When the user confirms the owner
            await confirm();

            // Then the list opens, not the "are there more" question (BC-09)
            expect(Navigation.navigate).toHaveBeenCalledWith(getUSDRoute(USD_PAGES.UBOS_LIST));
        });

        it('goes back from the name page to the page that opened it', async () => {
            // Given a listed owner opened from the list
            await setUp({
                hasOtherBeneficialOwners: true,
                usdOwners: [ADA],
                ...getUSDBufferDraft(ADA),
            });
            await renderStep(USD_STEP, USD_PAGES.LEGAL_NAME);

            // When the user presses Back
            await pressBack();

            // Then the list opens again (USD-78)
            expect(Navigation.goBack).toHaveBeenCalledWith(getUSDRoute(USD_PAGES.UBOS_LIST));
        });

        it('goes back from the name page of a new owner to the question about more owners once others are listed', async () => {
            // Given a new owner next to one listed owner
            await setUp({
                hasOtherBeneficialOwners: true,
                usdOwners: [ADA],
                ...getUSDBufferDraft(ALAN),
            });
            await renderStep(USD_STEP, USD_PAGES.LEGAL_NAME);

            // When the user presses Back
            await pressBack();

            // Then "are there more" opens (USD-78)
            expect(Navigation.goBack).toHaveBeenCalledWith(getUSDRoute(USD_PAGES.ARE_THERE_MORE_UBOS));
        });

        it('shows a loader on a details page while no owner was started', async () => {
            // Given a draft without an owner in the buffer, as on a link straight to a details page
            await setUp({});

            // When the name page renders
            await renderStep(USD_STEP, USD_PAGES.LEGAL_NAME);

            // Then the form is not shown, so nobody types an owner that no question started (USD-78)
            expect(screen.queryByText('beneficialOwnerInfoStep.enterLegalFirstAndLastName')).not.toBeOnTheScreen();
        });

        it('opens the first question after Next even when it is answered', async () => {
            // Given a user who arrived by Next from the business info step and owns 25%
            mockNavigationState = {
                routes: [
                    {
                        key: 'previous-route',
                        name: SCREENS.SETTINGS.BANK_ONBOARDING_LAB.USD_SETUP,
                        params: {policyID: POLICY_ID, page: USD_STEPS.COMPANY},
                    },
                    {
                        key: ROUTE_KEY,
                        name: SCREENS.SETTINGS.BANK_ONBOARDING_LAB.USD_SETUP,
                        params: {policyID: POLICY_ID, page: USD_STEPS.BENEFICIAL_OWNERS},
                    },
                ],
            };
            await setUp({ownsMoreThan25Percent: true});

            // When the step opens without a sub page
            await renderStep(USD_STEP, undefined);

            // Then the first question opens, not the list of a resume
            expect(screen.getByText('beneficialOwnerInfoStep.doYouOwn25percent')).toBeOnTheScreen();
            expect(Navigation.setParams).toHaveBeenCalledWith({subPage: USD_PAGES.IS_USER_UBO}, ROUTE_KEY);
        });

        it.each([
            ['the list when the user owns 25%', {ownsMoreThan25Percent: true}, undefined, USD_PAGES.UBOS_LIST],
            ['the list when someone else owns 25% and is listed', {hasOtherBeneficialOwners: true, usdOwners: [ADA]}, undefined, USD_PAGES.UBOS_LIST],
            ['the second question when the step was saved without owners', {}, {achData: {policyID: POLICY_ID, ownsMoreThan25Percent: false}}, USD_PAGES.IS_ANYONE_ELSE_UBO],
            ['the first question otherwise', {}, undefined, USD_PAGES.IS_USER_UBO],
        ])('opens %s on a resume', async (_name: string, draft: OnboardingDraft, account: OnboardingAccount | undefined, expectedPage: PageID) => {
            // Given a resume, so no step lies under this one
            await setUp(draft, account);

            // When the step opens without a sub page
            await renderStep(USD_STEP, undefined);

            // Then the page of USD-72 is written to the URL
            expect(Navigation.setParams).toHaveBeenCalledWith({subPage: expectedPage}, ROUTE_KEY);
        });
    });

    describe('NonUSD', () => {
        it('keeps three other owners and starts the user when the user owns 25%', async () => {
            // Given the user and four other owners in the list
            const user = createGlobalOwner(CURRENT_USER_OWNER_ID, '25');
            const others = ['a', 'b', 'c', 'd'].map((id) => createGlobalOwner(id, '25'));
            await setUp({globalOwners: [user, ...others]});
            await renderStep(NON_USD_STEP, NON_USD_PAGES.IS_USER_BENEFICIAL_OWNER);

            // When the user says they own 25%
            await answer('common.yes');

            // Then three others stay, the user's details fill the buffer, and the user's name page opens (non-USD map row 52)
            expect(saveDraft).toHaveBeenCalledWith({
                ownsMoreThan25Percent: true,
                globalOwners: others.slice(0, 3),
                ...getGlobalBufferDraft(user),
            });
            expect(Navigation.navigate).toHaveBeenCalledWith(getNonUSDRoute(NON_USD_PAGES.NAME));
        });

        it('removes the user and asks about the others when the user does not own 25%', async () => {
            // Given the user and another owner in the list
            const other = createGlobalOwner('a', '30');
            await setUp({
                globalOwners: [createGlobalOwner(CURRENT_USER_OWNER_ID, '50'), other],
            });
            await renderStep(NON_USD_STEP, NON_USD_PAGES.IS_USER_BENEFICIAL_OWNER);

            // When the user says they do not own 25%
            await answer('common.no');

            // Then only the other owner stays and the second question opens (non-USD map row 52)
            expect(saveDraft).toHaveBeenCalledWith({
                ownsMoreThan25Percent: false,
                globalOwners: [other],
            });
            expect(Navigation.navigate).toHaveBeenCalledWith(getNonUSDRoute(NON_USD_PAGES.IS_ANYONE_ELSE_BENEFICIAL_OWNER));
        });

        it('sends no owners at once when nobody owns 25%', async () => {
            // Given a user who does not own 25%, and an owner left by an earlier "yes"
            answerWrites('success');
            await setUp({
                ownsMoreThan25Percent: false,
                globalOwners: [createGlobalOwner('a', '30')],
            });
            await renderStep(NON_USD_STEP, NON_USD_PAGES.IS_ANYONE_ELSE_BENEFICIAL_OWNER);

            // When the user says nobody else owns 25%
            await answer('common.no');

            // Then the list is emptied, the request goes out with no owners, and the signer step opens (non-USD map row 53)
            expect(saveDraft).toHaveBeenCalledWith({
                anyIndividualOwn25PercentOrMore: false,
                globalOwners: [],
            });
            expect(write).toHaveBeenCalledWith(
                WRITE_COMMANDS.SAVE_ONBOARDING_BENEFICIAL_OWNERS,
                expect.objectContaining({
                    ownsMoreThan25Percent: false,
                    anyIndividualOwn25PercentOrMore: false,
                    beneficialOwners: '[]',
                }),
                expect.anything(),
            );
            expect(Navigation.navigate).toHaveBeenCalledWith(getFlowRoute(NON_USD_TARGET, {step: NON_USD_STEPS.SIGNER_INFO}));
        });

        it('keeps only the user and opens the list when only the user owns 25%', async () => {
            // Given the user and another owner in the list
            const user = createGlobalOwner(CURRENT_USER_OWNER_ID, '50');
            await setUp({
                ownsMoreThan25Percent: true,
                globalOwners: [user, createGlobalOwner('a', '30')],
            });
            await renderStep(NON_USD_STEP, NON_USD_PAGES.IS_ANYONE_ELSE_BENEFICIAL_OWNER);

            // When the user says nobody else owns 25%
            await answer('common.no');

            // Then only the user stays and the list opens (non-USD map row 53)
            expect(saveDraft).toHaveBeenCalledWith({
                anyIndividualOwn25PercentOrMore: false,
                globalOwners: [user],
            });
            expect(write).not.toHaveBeenCalled();
            expect(Navigation.navigate).toHaveBeenCalledWith(getNonUSDRoute(NON_USD_PAGES.BENEFICIAL_OWNERS_LIST));
        });

        it('opens the list when someone else owns 25% but the shares leave no room', async () => {
            // Given listed shares of 80%
            await setUp({
                ownsMoreThan25Percent: true,
                globalOwners: [createGlobalOwner(CURRENT_USER_OWNER_ID, '80')],
            });
            await renderStep(NON_USD_STEP, NON_USD_PAGES.IS_ANYONE_ELSE_BENEFICIAL_OWNER);

            // When the user says someone else owns 25%
            await answer('common.yes');

            // Then no owner starts and the list opens (non-USD map row 53, non-USD map row 55)
            expect(saveDraft).toHaveBeenCalledWith({
                anyIndividualOwn25PercentOrMore: true,
            });
            expect(Navigation.navigate).toHaveBeenCalledWith(getNonUSDRoute(NON_USD_PAGES.BENEFICIAL_OWNERS_LIST));
        });

        it('starts a new owner when someone else owns 25% and the shares leave room', async () => {
            // Given listed shares of 50%
            await setUp({
                ownsMoreThan25Percent: true,
                globalOwners: [createGlobalOwner(CURRENT_USER_OWNER_ID, '50')],
            });
            await renderStep(NON_USD_STEP, NON_USD_PAGES.IS_ANYONE_ELSE_BENEFICIAL_OWNER);

            // When the user says someone else owns 25%
            await answer('common.yes');

            // Then an empty owner starts on the name page with the title for another owner (non-USD map row 53, non-USD map row 56)
            expect(saveDraft).toHaveBeenCalledWith({
                anyIndividualOwn25PercentOrMore: true,
                ownerBeingModifiedID: ANY_NEW_OWNER_ID,
                ...EMPTY_OWNER_BUFFER,
            });
            expect(Navigation.navigate).toHaveBeenCalledWith(getNonUSDRoute(NON_USD_PAGES.NAME));
        });

        it('starts another owner when there are more', async () => {
            // Given one other owner with 30%
            await setUp({
                anyIndividualOwn25PercentOrMore: true,
                globalOwners: [createGlobalOwner('a', '30')],
            });
            await renderStep(NON_USD_STEP, NON_USD_PAGES.ARE_THERE_MORE_BENEFICIAL_OWNERS);

            // When the user says more people own 25%
            await answer('common.yes');

            // Then a new owner starts on its name page (non-USD map row 54)
            expect(saveDraft).toHaveBeenCalledWith({
                ownerBeingModifiedID: ANY_NEW_OWNER_ID,
                ...EMPTY_OWNER_BUFFER,
            });
            expect(Navigation.navigate).toHaveBeenCalledWith(getNonUSDRoute(NON_USD_PAGES.NAME));
        });

        it('opens the list when nobody more owns 25%', async () => {
            // Given one other owner
            await setUp({
                anyIndividualOwn25PercentOrMore: true,
                globalOwners: [createGlobalOwner('a', '30')],
            });
            await renderStep(NON_USD_STEP, NON_USD_PAGES.ARE_THERE_MORE_BENEFICIAL_OWNERS);

            // When the user says nobody more owns 25%
            await answer('common.no');

            // Then the list opens and nothing is saved, so the second question keeps its "yes" (non-USD map row 54)
            expect(saveDraft).toHaveBeenCalledWith({});
            expect(Navigation.navigate).toHaveBeenCalledWith(getNonUSDRoute(NON_USD_PAGES.BENEFICIAL_OWNERS_LIST));
        });

        it('adds the user and asks about the others after the user confirms', async () => {
            // Given the user in the buffer, outside the list
            const user = createGlobalOwner(CURRENT_USER_OWNER_ID, '50');
            await setUp({
                ownsMoreThan25Percent: true,
                globalOwners: [],
                ...getGlobalBufferDraft(user),
            });
            await renderStep(NON_USD_STEP, NON_USD_PAGES.CONFIRMATION);

            // When the user confirms their details
            await confirm();

            // Then the user joins the list and the question about the others opens (non-USD map row 59)
            expect(saveDraft).toHaveBeenCalledWith({globalOwners: [user]});
            expect(Navigation.navigate).toHaveBeenCalledWith(getNonUSDRoute(NON_USD_PAGES.IS_ANYONE_ELSE_BENEFICIAL_OWNER));
        });

        it('adds another owner and asks for more while the shares leave room', async () => {
            // Given another owner with 30% in the buffer
            const owner = createGlobalOwner('a', '30');
            await setUp({
                anyIndividualOwn25PercentOrMore: true,
                globalOwners: [],
                ...getGlobalBufferDraft(owner),
            });
            await renderStep(NON_USD_STEP, NON_USD_PAGES.CONFIRMATION);

            // When the user confirms the owner
            await confirm();

            // Then "are there more" opens (non-USD map row 59)
            expect(saveDraft).toHaveBeenCalledWith({globalOwners: [owner]});
            expect(Navigation.navigate).toHaveBeenCalledWith(getNonUSDRoute(NON_USD_PAGES.ARE_THERE_MORE_BENEFICIAL_OWNERS));
        });

        it('opens the list once the shares leave no room', async () => {
            // Given the user with 50% and another owner with 30% in the buffer
            const owner = createGlobalOwner('a', '30');
            await setUp({
                globalOwners: [createGlobalOwner(CURRENT_USER_OWNER_ID, '50')],
                ...getGlobalBufferDraft(owner),
            });
            await renderStep(NON_USD_STEP, NON_USD_PAGES.CONFIRMATION);

            // When the user confirms the owner
            await confirm();

            // Then the list opens, because the shares add up to more than 75% (non-USD map row 59)
            expect(Navigation.navigate).toHaveBeenCalledWith(getNonUSDRoute(NON_USD_PAGES.BENEFICIAL_OWNERS_LIST));
        });

        it('returns an owner opened from the list to the list', async () => {
            // Given a listed owner with 30% in the buffer, as after a row press
            const owner = createGlobalOwner('a', '30');
            await setUp({globalOwners: [owner], ...getGlobalBufferDraft(owner)});
            await renderStep(NON_USD_STEP, NON_USD_PAGES.CONFIRMATION);

            // When the user confirms the owner
            await confirm();

            // Then the list opens (non-USD map row 59, BC-09)
            expect(Navigation.navigate).toHaveBeenCalledWith(getNonUSDRoute(NON_USD_PAGES.BENEFICIAL_OWNERS_LIST));
        });

        it('goes back from the name page of the user to the question about the user', async () => {
            // Given the user in the buffer after "I own 25%"
            await setUp({
                ownsMoreThan25Percent: true,
                globalOwners: [createGlobalOwner('a', '30')],
                ...getGlobalBufferDraft(createGlobalOwner(CURRENT_USER_OWNER_ID, '')),
            });
            await renderStep(NON_USD_STEP, NON_USD_PAGES.NAME);
            expect(screen.getByText('ownershipInfoStep.whatsYourName')).toBeOnTheScreen();

            // When the user presses Back
            await pressBack();

            // Then the question that opened the page opens (BC-09)
            expect(Navigation.goBack).toHaveBeenCalledWith(getNonUSDRoute(NON_USD_PAGES.IS_USER_BENEFICIAL_OWNER));
        });

        it('goes back from the list to "are there more" while others are listed and the shares leave room', async () => {
            // Given the user and another owner with 50% together
            await setUp({
                ownsMoreThan25Percent: true,
                globalOwners: [createGlobalOwner(CURRENT_USER_OWNER_ID, '25'), createGlobalOwner('a', '25')],
            });
            await renderStep(NON_USD_STEP, NON_USD_PAGES.BENEFICIAL_OWNERS_LIST);

            // When the user presses Back
            await pressBack();

            // Then the last question opens, not the confirmation of an owner that is already listed
            expect(Navigation.goBack).toHaveBeenCalledWith(getNonUSDRoute(NON_USD_PAGES.ARE_THERE_MORE_BENEFICIAL_OWNERS));
        });

        it('rejects a share that brings the total above 100', async () => {
            // Given another owner with 80% and a new owner in the buffer
            await setUp({
                globalOwners: [createGlobalOwner('a', '80')],
                ...getGlobalBufferDraft(createGlobalOwner('b', '')),
            });
            await renderStep(NON_USD_STEP, NON_USD_PAGES.OWNERSHIP_PERCENTAGE);

            // When the user enters 30%
            fireEvent.changeText(screen.getByLabelText('ownershipInfoStep.ownership'), '30');
            await waitForBatchedUpdatesWithAct();
            fireEvent.press(screen.getByText('common.next'));
            await waitForBatchedUpdatesWithAct();

            // Then the share error is shown and the page stays (non-USD map row 57)
            expect(screen.getByText('bankAccount.error.ownershipPercentage')).toBeOnTheScreen();
            expect(Navigation.navigate).not.toHaveBeenCalled();
        });
    });
});
