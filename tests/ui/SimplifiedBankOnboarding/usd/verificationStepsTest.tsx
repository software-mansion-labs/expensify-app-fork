import {fireEvent, render, screen} from '@testing-library/react-native';

import type InteractiveStepWrapperModule from '@components/InteractiveStepWrapper';
import OnyxListItemProvider from '@components/OnyxListItemProvider';

import useNetwork from '@hooks/useNetwork';

import Navigation from '@libs/Navigation/Navigation';

import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {PageID, StepID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import type {ACHData} from '@pages/SimplifiedBankOnboarding/contract/onyx';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {saveFormDraft} from '@pages/SimplifiedBankOnboarding/core/draft/draft';
import {FlowStepPositionContext, OnboardingFlowActionsContext, OnboardingFlowStateContext} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import type {FlowStepPosition, FlowTarget, OnboardingFlowActions, OnboardingFlowState} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import {getFlowRoute} from '@pages/SimplifiedBankOnboarding/core/flow/flowRoutes';
import type {FlowNavigationState} from '@pages/SimplifiedBankOnboarding/core/flow/flowRoutes';
import {clearRequestState} from '@pages/SimplifiedBankOnboarding/core/requests/runRequest';
import BusinessInfoStep from '@pages/SimplifiedBankOnboarding/flows/usd/businessInfo/BusinessInfoStep';
import KYBDocumentsStep from '@pages/SimplifiedBankOnboarding/flows/usd/kybDocuments/KYBDocumentsStep';
import VerifyIdentityStep from '@pages/SimplifiedBankOnboarding/flows/usd/verifyIdentity/VerifyIdentityStep';
import {READ_COMMANDS, WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {read, write} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';

import ONYXKEYS from '@src/ONYXKEYS';
import SCREENS from '@src/SCREENS';
import type {OnyxData} from '@src/types/onyx/Request';

import type * as NativeNavigation from '@react-navigation/native';
import type {ComponentType} from 'react';
import type ReactNative from 'react-native';
import type {OnyxKey} from 'react-native-onyx';

import {NavigationContainer} from '@react-navigation/native';
import React from 'react';
import Onyx from 'react-native-onyx';

import waitForBatchedUpdatesWithAct from '../../../utils/waitForBatchedUpdatesWithAct';

const POLICY_ID = '1';
const BANK_ACCOUNT_ID = 5;
const ROUTE_KEY = 'current-route';
const TARGET: FlowTarget = {kind: 'usd', policyID: POLICY_ID, backTo: undefined};
const {PAGE_NAMES, BUSINESS_INFO_SUB_PAGES: BUSINESS_PAGES, KYB_DOCUMENT_TYPES} = SBO_CONST.USD;
const INCORPORATION_TYPE = Object.values(SBO_CONST.USD.INCORPORATION_TYPES).at(0);
const COMPANY_DRAFT: OnboardingDraft = {companyName: 'Acme', companyTaxID: '12-3456789', incorporationType: INCORPORATION_TYPE};
const TAX_ID_DOCUMENT = {name: 'tax.pdf'};

let mockNavigationState: FlowNavigationState = {routes: []};

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

jest.mock('@pages/SimplifiedBankOnboarding/mockBackend/mockApi', () => ({
    read: jest.fn(),
    write: jest.fn(),
}));

jest.mock('@hooks/useNetwork', () => jest.fn(() => ({isOffline: false})));

jest.mock('@hooks/useLocalize', () => jest.fn(() => ({translate: (key: string) => key})));

// The real wrapper needs the whole screen stack. The stand-in keeps the content, the part of the step that is tested.
jest.mock('@components/InteractiveStepWrapper', () => {
    const RN = jest.requireActual<typeof ReactNative>('react-native');
    return ({children}: React.ComponentProps<typeof InteractiveStepWrapperModule>) => <RN.View>{children}</RN.View>;
});

type StepUnderTest = {
    Step: ComponentType;
    step: StepID;

    /** The next step in the order of the flow. The flow itself skips it when its rule says so. */
    nextStep: StepID;
};

const BUSINESS_INFO: StepUnderTest = {Step: BusinessInfoStep, step: PAGE_NAMES.COMPANY, nextStep: PAGE_NAMES.BENEFICIAL_OWNERS};
const IDENTITY_CHECK: StepUnderTest = {Step: VerifyIdentityStep, step: PAGE_NAMES.VERIFY_IDENTITY, nextStep: PAGE_NAMES.COMPANY};
const DOCUMENTS: StepUnderTest = {Step: KYBDocumentsStep, step: PAGE_NAMES.KYB_DOCS, nextStep: PAGE_NAMES.VALIDATION};

const flowActions: OnboardingFlowActions = {
    saveDraft: (values) => saveFormDraft(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM, values),
    returnToEntry: jest.fn(),
    leaveFlow: jest.fn(),
    openStep: jest.fn(),
};

async function renderStep({Step, step, nextStep}: StepUnderTest, page?: PageID) {
    const screenName = SCREENS.SETTINGS.BANK_ONBOARDING_LAB.USD_SETUP;
    mockNavigationState = {routes: [{key: ROUTE_KEY, name: screenName, params: {policyID: POLICY_ID, page: step, subPage: page}}]};

    const flowState: OnboardingFlowState = {target: TARGET, bankAccount: {policyID: POLICY_ID, bankAccountID: BANK_ACCOUNT_ID}, formID: ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM};
    const position: FlowStepPosition = {step, previousStep: undefined, nextStep, counterIndex: 0, counterNames: ['1', '2'], page, isEditing: false};

    render(
        <OnyxListItemProvider>
            <NavigationContainer>
                <OnboardingFlowStateContext.Provider value={flowState}>
                    <OnboardingFlowActionsContext.Provider value={flowActions}>
                        <FlowStepPositionContext.Provider value={position}>
                            <Step />
                        </FlowStepPositionContext.Provider>
                    </OnboardingFlowActionsContext.Provider>
                </OnboardingFlowStateContext.Provider>
            </NavigationContainer>
        </OnyxListItemProvider>,
    );
    await waitForBatchedUpdatesWithAct();
}

async function setSavedData(achData: ACHData, draft: OnboardingDraft = {}) {
    await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {achData: {policyID: POLICY_ID, bankAccountID: BANK_ACCOUNT_ID, ...achData}});
    await Onyx.set(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT, draft);
    await waitForBatchedUpdatesWithAct();
}

async function press(text: string) {
    fireEvent.press(screen.getByText(text));
    await waitForBatchedUpdatesWithAct();
}

/** The mock API applies the data of every write the way the server does for a valid or for a rejected request */
function answerWrites(answer: 'success' | 'failure') {
    jest.mocked(write).mockImplementation((_command, _params, onyxData: OnyxData<OnyxKey> = {}) => {
        Onyx.update(onyxData.optimisticData ?? [])
            .then(() => Onyx.update(answer === 'success' ? (onyxData.successData ?? []) : (onyxData.failureData ?? [])))
            .then(() => Onyx.update(onyxData.finallyData ?? []));
    });
}

function expectStepOpened({nextStep}: StepUnderTest) {
    expect(Navigation.navigate).toHaveBeenCalledWith(getFlowRoute(TARGET, {step: nextStep}));
}

describe('USD verification steps', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        jest.mocked(useNetwork).mockReturnValue({isOffline: false});
        answerWrites('success');
        await clearRequestState();
        await Onyx.clear();
        await waitForBatchedUpdatesWithAct();
    });

    afterAll(() => clearRequestState());

    describe('business info', () => {
        it('opens the first page that is not answered on a resume', async () => {
            // Given a setup where only the company name is known
            await setSavedData({}, {companyName: 'Acme'});

            // When the step opens without a page
            await renderStep(BUSINESS_INFO);

            // Then the user lands on the tax ID, the first question that still misses an answer
            expect(screen.getByText('businessInfoStep.enterYourCompanyTaxIdNumber')).toBeOnTheScreen();
            expect(Navigation.setParams).toHaveBeenCalledWith({subPage: BUSINESS_PAGES.TAX_ID}, ROUTE_KEY);
        });

        it('opens the first page on a resume while the server reviews the setup', async () => {
            // Given a complete setup that the server is reviewing
            await setSavedData({state: SBO_CONST.STATE.VERIFYING}, COMPANY_DRAFT);

            // When the step opens without a page
            await renderStep(BUSINESS_INFO);

            // Then the step starts at the company name, so the user walks through every answer again
            expect(screen.getByText('businessInfoStep.enterTheNameOfYourBusiness')).toBeOnTheScreen();
        });

        it('sends the company with a tax ID of digits only and opens the owners step', async () => {
            // Given a draft with every answer, with the tax ID typed with a separator
            await setSavedData({}, COMPANY_DRAFT);
            await renderStep(BUSINESS_INFO, BUSINESS_PAGES.CONFIRMATION);

            // When the user confirms
            await press('common.confirm');

            // Then the server gets the tax ID without the separator, as the real flow sends it, and the next step opens
            expect(write).toHaveBeenCalledWith(
                WRITE_COMMANDS.UPDATE_COMPANY_INFORMATION,
                expect.objectContaining({companyName: 'Acme', companyTaxID: '123456789', incorporationType: INCORPORATION_TYPE}),
                expect.anything(),
            );
            expectStepOpened(BUSINESS_INFO);
        });
    });

    describe('identity check', () => {
        it('asks the server for a token when none is stored', async () => {
            // Given a setup with no token of the identity widget
            await setSavedData({});

            // When the step opens
            await renderStep(IDENTITY_CHECK);

            // Then the step reads the token, and the widget waits for it
            expect(read).toHaveBeenCalledWith(READ_COMMANDS.OPEN_IDENTITY_CHECK_FLOW, {policyID: POLICY_ID}, expect.anything());
            expect(screen.queryByText('[mock] Pass the identity check')).not.toBeOnTheScreen();
        });

        it('sends the result of the widget and opens the next step after the server accepted it', async () => {
            // Given a stored token, so the widget shows without a read
            await setSavedData({});
            await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ONFIDO_TOKEN, 'token');
            await renderStep(IDENTITY_CHECK);

            // When the widget returns its result
            await press('[mock] Pass the identity check');

            // Then the result is sent and the step ends
            expect(read).not.toHaveBeenCalled();
            expect(write).toHaveBeenCalledWith(WRITE_COMMANDS.VERIFY_IDENTITY, expect.objectContaining({onfidoData: 'mock-onfido-data'}), expect.anything());
            expectStepOpened(IDENTITY_CHECK);
        });

        it('stays on the step when the server rejects the result (BC-05)', async () => {
            // Given a stored token and a server that rejects the result
            answerWrites('failure');
            await setSavedData({});
            await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ONFIDO_TOKEN, 'token');
            await renderStep(IDENTITY_CHECK);

            // When the widget returns its result
            await press('[mock] Pass the identity check');

            // Then the step does not move on, and it asks for a fresh token, because a failed write drops the used one
            expect(write).toHaveBeenCalledTimes(1);
            expect(Navigation.navigate).not.toHaveBeenCalled();
            expect(read).toHaveBeenCalledWith(READ_COMMANDS.OPEN_IDENTITY_CHECK_FLOW, {policyID: POLICY_ID}, expect.anything());
        });
    });

    describe('company documents', () => {
        it('shows one file input for each document that the server asked for', async () => {
            // Given a verification that asks only for the tax ID document
            await setSavedData({requiredKYBDocuments: [KYB_DOCUMENT_TYPES.COMPANY_TAX_ID]});

            // When the step opens
            await renderStep(DOCUMENTS);

            // Then the address document is not asked for
            expect(screen.getByText('documentsStep.taxIDVerification')).toBeOnTheScreen();
            expect(screen.queryByText('documentsStep.companyAddressVerification')).not.toBeOnTheScreen();
        });

        it('asks for a file of each required document', async () => {
            // Given a required document with no file
            await setSavedData({requiredKYBDocuments: [KYB_DOCUMENT_TYPES.COMPANY_TAX_ID]});
            await renderStep(DOCUMENTS);

            // When the user submits
            await press('common.verify');

            // Then the file input shows the required message and nothing is sent
            expect(screen.getByText('common.error.fieldRequired')).toBeOnTheScreen();
            expect(write).not.toHaveBeenCalled();
        });

        it('sends the names of the files and opens the validation after the server answered', async () => {
            // Given a required document with a file in the draft
            await setSavedData({requiredKYBDocuments: [KYB_DOCUMENT_TYPES.COMPANY_TAX_ID]}, {[INPUT_IDS.COMPANY_TAX_ID_DOCUMENT]: [TAX_ID_DOCUMENT]});
            await renderStep(DOCUMENTS);

            // When the user submits
            await press('common.verify');

            // Then the mock server gets the file name, because it takes no files, and the step ends
            expect(write).toHaveBeenCalledWith(WRITE_COMMANDS.UPLOAD_KYB_DOCUMENTS, expect.objectContaining({documentNames: [TAX_ID_DOCUMENT.name]}), expect.anything());
            expectStepOpened(DOCUMENTS);
        });
    });
});
