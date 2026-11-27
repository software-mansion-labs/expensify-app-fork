import {fireEvent, screen} from '@testing-library/react-native';

import type InteractiveStepWrapperModule from '@components/InteractiveStepWrapper';

import Navigation from '@libs/Navigation/Navigation';

import type {OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import type {StepID} from '@pages/SimplifiedBankOnboarding/contract/ids';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type {FlowStepPosition, FlowTarget} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import {getFlowRoute} from '@pages/SimplifiedBankOnboarding/core/flow/flowRoutes';
import type {FlowNavigationState} from '@pages/SimplifiedBankOnboarding/core/flow/flowRoutes';
import {clearRequestState} from '@pages/SimplifiedBankOnboarding/core/requests/runRequest';
import AgreementsStep from '@pages/SimplifiedBankOnboarding/flows/nonUSD/agreements/AgreementsStep';
import CountryStep from '@pages/SimplifiedBankOnboarding/flows/nonUSD/country/CountryStep';
import DocusignStep from '@pages/SimplifiedBankOnboarding/flows/nonUSD/docusign/DocusignStep';
import CompleteVerificationStep from '@pages/SimplifiedBankOnboarding/flows/usd/completeVerification/CompleteVerificationStep';
import {WRITE_COMMANDS} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import {write} from '@pages/SimplifiedBankOnboarding/mockBackend/mockApi';

import ONYXKEYS from '@src/ONYXKEYS';

import type * as NativeNavigation from '@react-navigation/native';
import type {ComponentType} from 'react';
import type ReactNative from 'react-native';

import React from 'react';
import Onyx from 'react-native-onyx';

import {answerWrites, renderInFlow} from '../../utils/BankOnboardingLabStepTestUtils';
import getOnyxValue from '../../utils/getOnyxValue';
import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

const POLICY_ID = '1';
const BANK_ACCOUNT_ID = 5;
const {CURRENCY, USD, NON_USD} = SBO_CONST;
const USD_TARGET: FlowTarget = {kind: 'usd', policyID: POLICY_ID, backTo: undefined};
const NON_USD_TARGET: FlowTarget = {kind: 'nonUSD', policyID: POLICY_ID, backTo: undefined};

const ACCEPTED_USD_AGREEMENTS: OnboardingDraft = {isAuthorizedToUseBankAccount: true, certifyTrueInformation: true, acceptTermsAndConditions: true};
const ACCEPTED_GLOBAL_AGREEMENTS: OnboardingDraft = {authorizedToBindClientToAgreement: true, agreeToTermsAndConditions: true, consentToPrivacyNotice: true};
const BANK_STATEMENT = {name: 'statement.pdf'};
const AUTHORIZATION_FORM = {name: 'authorization.pdf'};

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

jest.mock('@pages/SimplifiedBankOnboarding/mockBackend/mockApi', () => ({
    read: jest.fn(),
    write: jest.fn(),
}));

jest.mock('@hooks/useLocalize', () => jest.fn(() => ({translate: (key: string) => key})));

// The real wrapper needs the whole screen stack. The stand-in keeps the content, the part of the step that is tested.
jest.mock('@components/InteractiveStepWrapper', () => {
    const RN = jest.requireActual<typeof ReactNative>('react-native');
    return ({children}: React.ComponentProps<typeof InteractiveStepWrapperModule>) => <RN.View>{children}</RN.View>;
});

type StepUnderTest = {
    Step: ComponentType;
    target: FlowTarget;
    step: StepID;

    /** The next step in the order of the flow. The flow itself skips it when its rule says so. */
    nextStep: StepID;
};

const USD_AGREEMENTS: StepUnderTest = {Step: CompleteVerificationStep, target: USD_TARGET, step: USD.PAGE_NAMES.ACH_CONTRACT, nextStep: USD.PAGE_NAMES.KYB_DOCS};
const GLOBAL_COUNTRY: StepUnderTest = {Step: CountryStep, target: NON_USD_TARGET, step: NON_USD.PAGE_NAMES.COUNTRY, nextStep: NON_USD.PAGE_NAMES.BANK_INFO};
const GLOBAL_AGREEMENTS: StepUnderTest = {Step: AgreementsStep, target: NON_USD_TARGET, step: NON_USD.PAGE_NAMES.AGREEMENTS, nextStep: NON_USD.PAGE_NAMES.DOCUSIGN};
const DOCUSIGN: StepUnderTest = {Step: DocusignStep, target: NON_USD_TARGET, step: NON_USD.PAGE_NAMES.DOCUSIGN, nextStep: NON_USD.PAGE_NAMES.FINISH};

async function renderStep({Step, target, step, nextStep}: StepUnderTest) {
    const position: FlowStepPosition = {step, previousStep: undefined, nextStep, counterIndex: 0, counterNames: ['1', '2'], page: undefined, isEditing: false};

    await renderInFlow(<Step />, {target, position, bankAccountID: BANK_ACCOUNT_ID});
}

async function setSavedData(currency: string, draft: OnboardingDraft = {}) {
    await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_ACCOUNT, {achData: {policyID: POLICY_ID, bankAccountID: BANK_ACCOUNT_ID}});
    await Onyx.set(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_WORKSPACES, {[POLICY_ID]: {id: POLICY_ID, name: 'Workspace', outputCurrency: currency, role: SBO_CONST.WORKSPACE_ROLE.ADMIN}});
    await Onyx.set(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT, draft);
    await waitForBatchedUpdatesWithAct();
}

async function press(text: string) {
    fireEvent.press(screen.getByText(text));
    await waitForBatchedUpdatesWithAct();
}

function expectStepOpened({target, nextStep}: StepUnderTest) {
    expect(Navigation.navigate).toHaveBeenCalledWith(getFlowRoute(target, {step: nextStep}));
}

describe('steps made of one form', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        answerWrites('success');
        await clearRequestState();
        await Onyx.clear();
        await waitForBatchedUpdatesWithAct();
    });

    afterAll(() => clearRequestState());

    describe('USD agreements', () => {
        it('shows the error of each agreement that is not accepted and sends nothing', async () => {
            // Given a setup with no agreement accepted
            await setSavedData(CURRENCY.USD);
            await renderStep(USD_AGREEMENTS);

            // When the user submits
            await press('common.saveAndContinue');

            // Then each checkbox shows its own message instead of the common required one, and the step stays
            expect(screen.getByText('completeVerificationStep.isAuthorizedToUseBankAccountError')).toBeOnTheScreen();
            expect(screen.getByText('completeVerificationStep.certifyTrueAndAccurateError')).toBeOnTheScreen();
            expect(screen.getByText('common.error.acceptTerms')).toBeOnTheScreen();
            expect(write).not.toHaveBeenCalled();
            expect(Navigation.navigate).not.toHaveBeenCalled();
        });

        it('sends the agreements and opens the next step of the flow after the server answered', async () => {
            // Given a draft with every agreement accepted
            await setSavedData(CURRENCY.USD, ACCEPTED_USD_AGREEMENTS);
            await renderStep(USD_AGREEMENTS);

            // When the user submits
            await press('common.saveAndContinue');

            // Then the agreements are sent, and the step opens the documents step, which the flow skips when the answer
            // of the server asks for no documents
            expect(write).toHaveBeenCalledWith(WRITE_COMMANDS.ACCEPT_ACH_CONTRACT, expect.objectContaining(ACCEPTED_USD_AGREEMENTS), expect.anything());
            expectStepOpened(USD_AGREEMENTS);
        });
    });

    describe('NonUSD country', () => {
        it('asks for a country before it moves on', async () => {
            // Given a EUR setup with no country picked
            await setSavedData(CURRENCY.EUR);
            await renderStep(GLOBAL_COUNTRY);

            // When the user confirms
            await press('common.confirm');

            // Then the country row shows the required message and the step stays
            expect(screen.getByText('common.error.fieldRequired')).toBeOnTheScreen();
            expect(Navigation.navigate).not.toHaveBeenCalled();
        });

        it('keeps the country in the draft and opens the bank step without a request', async () => {
            // Given a EUR setup with a country in the draft
            await setSavedData(CURRENCY.EUR, {country: 'DE'});
            await renderStep(GLOBAL_COUNTRY);

            // When the user confirms
            await press('common.confirm');

            // Then the step moves on with nothing sent, because the bank step sends the country with the bank data
            const draft = await getOnyxValue(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
            expect(draft?.country).toBe('DE');
            expect(write).not.toHaveBeenCalled();
            expectStepOpened(GLOBAL_COUNTRY);
        });

        it('cannot be confirmed for a currency that has no country to offer', async () => {
            // Given a workspace whose currency the NonUSD flow has no countries for
            await setSavedData(CURRENCY.USD, {country: 'DE'});
            await renderStep(GLOBAL_COUNTRY);

            // When the user presses the confirm button
            await press('common.confirm');

            // Then nothing happens, because the button is disabled
            expect(Navigation.navigate).not.toHaveBeenCalled();
        });
    });

    describe('NonUSD agreements', () => {
        it('shows the error of each agreement that is not accepted', async () => {
            // Given a EUR setup with no agreement accepted
            await setSavedData(CURRENCY.EUR);
            await renderStep(GLOBAL_AGREEMENTS);

            // When the user submits
            await press('agreementsStep.accept');

            // Then each checkbox shows its own message, and nothing asks for a bank statement
            expect(screen.getByText('agreementsStep.error.authorized')).toBeOnTheScreen();
            expect(screen.getByText('common.error.acceptTerms')).toBeOnTheScreen();
            expect(screen.getByText('agreementsStep.error.consent')).toBeOnTheScreen();
            expect(screen.queryByText('agreementsStep.bankStatement')).not.toBeOnTheScreen();
            expect(write).not.toHaveBeenCalled();
        });

        it('ends the setup itself for a currency that needs no docusign', async () => {
            // Given a EUR setup with every agreement accepted
            await setSavedData(CURRENCY.EUR, ACCEPTED_GLOBAL_AGREEMENTS);
            await renderStep(GLOBAL_AGREEMENTS);

            // When the user accepts
            await press('agreementsStep.accept');

            // Then the step sends the request that ends the setup, without file names, and moves on after the answer
            expect(write).toHaveBeenCalledWith(WRITE_COMMANDS.FINISH_GLOBAL_BANK_ACCOUNT_ONBOARDING, expect.objectContaining(ACCEPTED_GLOBAL_AGREEMENTS), expect.anything());
            expect(jest.mocked(write).mock.calls.at(0)?.at(1)).not.toHaveProperty('bankStatementName');
            expectStepOpened(GLOBAL_AGREEMENTS);
        });

        it('asks for the bank statement when docusign follows', async () => {
            // Given an AUD setup with every agreement accepted and no bank statement
            await setSavedData(CURRENCY.AUD, ACCEPTED_GLOBAL_AGREEMENTS);
            await renderStep(GLOBAL_AGREEMENTS);

            // When the user confirms
            await press('common.confirm');

            // Then the file input shows the required message and the step stays
            expect(screen.getByText('common.error.fieldRequired')).toBeOnTheScreen();
            expect(Navigation.navigate).not.toHaveBeenCalled();
        });

        it('leaves the request to the docusign step when docusign follows', async () => {
            // Given an AUD setup with every agreement accepted and a bank statement
            await setSavedData(CURRENCY.AUD, {...ACCEPTED_GLOBAL_AGREEMENTS, bankStatement: [BANK_STATEMENT]});
            await renderStep(GLOBAL_AGREEMENTS);

            // When the user confirms
            await press('common.confirm');

            // Then the step opens docusign with nothing sent, because docusign sends the agreements with both files
            expect(write).not.toHaveBeenCalled();
            expectStepOpened(GLOBAL_AGREEMENTS);
        });
    });

    describe('NonUSD docusign', () => {
        it('asks for the signed form', async () => {
            // Given an AUD setup with no authorization form
            await setSavedData(CURRENCY.AUD, {...ACCEPTED_GLOBAL_AGREEMENTS, bankStatement: [BANK_STATEMENT]});
            await renderStep(DOCUSIGN);

            // When the user submits
            await press('common.submit');

            // Then the file input shows the required message and nothing is sent
            expect(screen.getByText('common.error.fieldRequired')).toBeOnTheScreen();
            expect(write).not.toHaveBeenCalled();
        });

        it('ends the setup with the names of both files', async () => {
            // Given an AUD setup with the agreements, the bank statement and the authorization form
            await setSavedData(CURRENCY.AUD, {...ACCEPTED_GLOBAL_AGREEMENTS, bankStatement: [BANK_STATEMENT], achAuthorizationForm: [AUTHORIZATION_FORM]});
            await renderStep(DOCUSIGN);

            // When the user submits
            await press('common.submit');

            // Then the request carries the file that the agreements step collected and the one of this step
            expect(write).toHaveBeenCalledWith(
                WRITE_COMMANDS.FINISH_GLOBAL_BANK_ACCOUNT_ONBOARDING,
                expect.objectContaining({...ACCEPTED_GLOBAL_AGREEMENTS, bankStatementName: BANK_STATEMENT.name, achAuthorizationFormName: AUTHORIZATION_FORM.name}),
                expect.anything(),
            );
            expectStepOpened(DOCUSIGN);
        });
    });
});
