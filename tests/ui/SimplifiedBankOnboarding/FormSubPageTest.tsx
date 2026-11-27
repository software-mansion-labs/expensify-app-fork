import {fireEvent, screen} from '@testing-library/react-native';

import type InteractiveStepWrapperModule from '@components/InteractiveStepWrapper';
import TextInput from '@components/TextInput';

import Navigation from '@libs/Navigation/Navigation';

import INPUT_IDS from '@pages/SimplifiedBankOnboarding/contract/form';
import type {InputID, OnboardingDraft} from '@pages/SimplifiedBankOnboarding/contract/form';
import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import type {FlowStepPosition, FlowTarget} from '@pages/SimplifiedBankOnboarding/core/flow/flowContext';
import {getFlowRoute} from '@pages/SimplifiedBankOnboarding/core/flow/flowRoutes';
import type {FlowNavigationState} from '@pages/SimplifiedBankOnboarding/core/flow/flowRoutes';
import OnboardingStep from '@pages/SimplifiedBankOnboarding/core/step/OnboardingStep';
import FormSubPage, {useResetFieldError} from '@pages/SimplifiedBankOnboarding/core/subPageForms/FormSubPage';
import type {SubPageFormErrors} from '@pages/SimplifiedBankOnboarding/core/subPageForms/FormSubPage';
import SubPageInput from '@pages/SimplifiedBankOnboarding/core/subPageForms/SubPageInput';

import ONYXKEYS from '@src/ONYXKEYS';

import type * as NativeNavigation from '@react-navigation/native';
import type ReactNative from 'react-native';

import React from 'react';
import {Button} from 'react-native';
import Onyx from 'react-native-onyx';

import {renderInFlow} from '../../utils/BankOnboardingLabStepTestUtils';
import getOnyxValue from '../../utils/getOnyxValue';
import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

const POLICY_ID = '1';
const TARGET: FlowTarget = {
    kind: 'usd',
    policyID: POLICY_ID,
    backTo: undefined,
};
const {PAGE_NAMES} = SBO_CONST.USD;
const CUSTOM_REQUIRED_MESSAGE = 'A message that only this page shows';

const mockNavigationState: FlowNavigationState = {routes: []};

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

jest.mock('@hooks/useLocalize', () => jest.fn(() => ({translate: (key: string) => key})));

// The real wrapper needs the whole screen stack. The stand-in keeps the content, the part of the step that is tested.
jest.mock('@components/InteractiveStepWrapper', () => {
    const RN = jest.requireActual<typeof ReactNative>('react-native');
    return ({children}: React.ComponentProps<typeof InteractiveStepWrapperModule>) => <RN.View>{children}</RN.View>;
});

const position: FlowStepPosition = {
    step: PAGE_NAMES.COMPANY,
    previousStep: PAGE_NAMES.REQUESTOR,
    nextStep: PAGE_NAMES.BENEFICIAL_OWNERS,
    counterIndex: 3,
    counterNames: ['1', '2', '3', '4', '5', '6', '7'],
    page: undefined,
    isEditing: false,
};

/** A page that gives its own message for an empty company name and none for an empty tax ID */
function validateCompany(values: OnboardingDraft): SubPageFormErrors {
    return values.companyName ? {} : {[INPUT_IDS.COMPANY_NAME]: CUSTOM_REQUIRED_MESSAGE};
}

type CompanyPageProps = {
    isSubmitDisabled?: boolean;
    optionalInputIDs?: InputID[];
    children?: React.ReactNode;
};

/** Stands in for an input that sets its own error, like the file input after a failed upload */
function ResetCompanyNameErrorButton() {
    const resetFieldError = useResetFieldError();
    return (
        <Button
            title="Reset company name error"
            onPress={() => resetFieldError(INPUT_IDS.COMPANY_NAME)}
        />
    );
}

async function renderCompanyPage({isSubmitDisabled, optionalInputIDs, children}: CompanyPageProps = {}) {
    await renderInFlow(
        <OnboardingStep
            title="Company"
            wrapperID="FormSubPageTest"
        >
            <FormSubPage
                title="Company details"
                inputIDs={[INPUT_IDS.COMPANY_NAME, INPUT_IDS.COMPANY_TAX_ID]}
                optionalInputIDs={optionalInputIDs}
                validate={validateCompany}
                isSubmitDisabled={isSubmitDisabled}
            >
                <SubPageInput
                    InputComponent={TextInput}
                    inputID={INPUT_IDS.COMPANY_NAME}
                    label="Company name"
                    accessibilityLabel="Company name"
                />
                <SubPageInput
                    InputComponent={TextInput}
                    inputID={INPUT_IDS.COMPANY_TAX_ID}
                    label="Tax ID"
                    accessibilityLabel="Tax ID"
                />
                {children}
            </FormSubPage>
        </OnboardingStep>,
        {target: TARGET, position},
    );
}

async function pressNext() {
    fireEvent.press(screen.getByText('common.next'));
    await waitForBatchedUpdatesWithAct();
}

describe('FormSubPage', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        await Onyx.clear();
        await waitForBatchedUpdatesWithAct();
    });

    it('keeps the message of the page for an empty input and adds the required message to the others', async () => {
        // Given a page whose validate gives its own message for an empty company name
        await renderCompanyPage();

        // When the user submits the empty page
        await pressNext();

        // Then the company name shows the message of the page, and only the tax ID gets the common required message
        expect(screen.getByText(CUSTOM_REQUIRED_MESSAGE)).toBeOnTheScreen();
        expect(screen.getAllByText('common.error.fieldRequired')).toHaveLength(1);
        expect(Navigation.navigate).not.toHaveBeenCalled();
    });

    it('saves the inputs and moves on when every input is filled', async () => {
        // Given a page with both inputs filled
        await renderCompanyPage();
        fireEvent.changeText(screen.getByLabelText('Company name'), 'Acme');
        fireEvent.changeText(screen.getByLabelText('Tax ID'), '123456789');
        await waitForBatchedUpdatesWithAct();

        // When the user submits
        await pressNext();

        // Then the answers are in the draft and the step ends, because the page has no request and is the only page
        const draft = await getOnyxValue(ONYXKEYS.FORMS.SIMPLIFIED_BANK_ONBOARDING_FORM_DRAFT);
        expect(draft?.companyName).toBe('Acme');
        expect(Navigation.navigate).toHaveBeenCalledWith(getFlowRoute(TARGET, {step: PAGE_NAMES.BENEFICIAL_OWNERS}));
    });

    it('moves on with an optional input left empty', async () => {
        // Given a page whose tax ID is optional, like an optional bank input that the server describes
        await renderCompanyPage({optionalInputIDs: [INPUT_IDS.COMPANY_TAX_ID]});
        fireEvent.changeText(screen.getByLabelText('Company name'), 'Acme');
        await waitForBatchedUpdatesWithAct();

        // When the user submits without a tax ID
        await pressNext();

        // Then no input shows the required message and the step ends
        expect(screen.queryByText('common.error.fieldRequired')).not.toBeOnTheScreen();
        expect(Navigation.navigate).toHaveBeenCalledWith(getFlowRoute(TARGET, {step: PAGE_NAMES.BENEFICIAL_OWNERS}));
    });

    it('does not submit while the page says that it cannot be submitted', async () => {
        // Given a filled page that is not ready, like a picker whose options are not loaded
        await renderCompanyPage({isSubmitDisabled: true});
        fireEvent.changeText(screen.getByLabelText('Company name'), 'Acme');
        fireEvent.changeText(screen.getByLabelText('Tax ID'), '123456789');
        await waitForBatchedUpdatesWithAct();

        // When the user presses the submit button
        await pressNext();

        // Then nothing moves, because the button is disabled
        expect(Navigation.navigate).not.toHaveBeenCalled();
    });

    it('lets an input inside the page remove its own validation error', async () => {
        // Given a page with an input that sets its own error, submitted empty so the company name shows a validation error
        await renderCompanyPage({children: <ResetCompanyNameErrorButton />});
        await pressNext();
        expect(screen.getByText(CUSTOM_REQUIRED_MESSAGE)).toBeOnTheScreen();

        // When the input removes the validation error of the company name, as the file input does before it shows an upload error
        fireEvent.press(screen.getByText('Reset company name error'));
        await waitForBatchedUpdatesWithAct();

        // Then the validation error is gone, so it cannot hide the error of the input, and the other input keeps its error
        expect(screen.queryByText(CUSTOM_REQUIRED_MESSAGE)).not.toBeOnTheScreen();
        expect(screen.getByText('common.error.fieldRequired')).toBeOnTheScreen();
    });
});
