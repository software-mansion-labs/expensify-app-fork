import {getScenarioConfig} from '@components/MultifactorAuthentication/config';
import type {
    MultifactorAuthenticationScenario,
    MultifactorAuthenticationScenarioAdditionalParams,
    MultifactorAuthenticationScenarioResponse,
} from '@components/MultifactorAuthentication/config/types';
import createActors from '@components/MultifactorAuthentication/machine/mfaActors';
import type {FinalizeOutcomeInput} from '@components/MultifactorAuthentication/machine/types';

import {clearDraftValues} from '@libs/actions/FormActions';
import type {MFAError} from '@libs/MultifactorAuthentication/shared/MFAResult';
import {createLocalMFAError} from '@libs/MultifactorAuthentication/shared/MFAResult';
import type {MultifactorAuthenticationCallbackResponse} from '@libs/MultifactorAuthentication/shared/types';
import Navigation from '@libs/Navigation/Navigation';
import {setRevealedPhysicalCardPin, setRevealedVirtualCardDetails} from '@libs/RevealedCardSecretsStore';

import {fireAndForgetDenyTransaction} from '@userActions/MultifactorAuthentication';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';

import {createActor, waitFor} from 'xstate';

// The rest of the finalize-outcome suite (`machine/finalizeOutcomeActor.test.ts`) drives the actor with
// synthetic callbacks to pin the actor's own decisions. This suite drives the same real actor with the
// six *resolved* scenario configs, so the side effects each callback is responsible for - storing card
// secrets, navigating, denying the transaction - and its SHOW-versus-SKIP answer are proven through the
// boundary the machine actually uses.

jest.mock('@components/MultifactorAuthentication/biometrics/captureRegistrationState', () => ({
    __esModule: true,
    default: () => Promise.resolve({hasServerCredentials: false, hasLocalCredentials: false, hasEverAcceptedSoftPrompt: false}),
}));

jest.mock('@components/MultifactorAuthentication/observability/trackMFAFlowOutcome', () => ({__esModule: true, default: jest.fn()}));

jest.mock('@libs/RevealedCardSecretsStore', () => ({setRevealedPhysicalCardPin: jest.fn(), setRevealedVirtualCardDetails: jest.fn()}));

jest.mock('@libs/actions/FormActions', () => ({clearDraftValues: jest.fn()}));

// The shared Navigation mock has no `closeRHPFlow`, which two of these callbacks call.
jest.mock('@libs/Navigation/Navigation', () => ({__esModule: true, default: {navigate: jest.fn(), goBack: jest.fn(), closeRHPFlow: jest.fn()}}));

jest.mock('@userActions/MultifactorAuthentication', () => ({
    ...jest.requireActual<Record<string, unknown>>('@userActions/MultifactorAuthentication'),
    fireAndForgetDenyTransaction: jest.fn(),
}));

const SCENARIO = CONST.MULTIFACTOR_AUTHENTICATION.SCENARIO;
const CALLBACK_RESPONSE = CONST.MULTIFACTOR_AUTHENTICATION.CALLBACK_RESPONSE;
const REASON = CONST.MULTIFACTOR_AUTHENTICATION.REASON;

const ACCOUNT_ID = 12345;
const CARD_ID = '4242';
const TRANSACTION_ID = 'txn-77';
const REVEALED_PIN = '9182';
const REVEALED_CARD_DETAILS = {pan: '4111111111111111', expiration: '12/29', cvv: '737'};

const PERSONAL_DETAILS = {
    legalFirstName: 'John',
    legalLastName: 'Doe',
    phoneNumber: '+441234567890',
    addressCity: 'London',
    addressStreet: '123 Test Street',
    addressStreet2: '',
    addressZip: 'SW1A 1AA',
    addressCountry: 'GB',
    addressProvince: '',
    dob: '1990-01-15',
} as const;

const SUCCESS_RESPONSE: MultifactorAuthenticationScenarioResponse = {httpStatusCode: 200, reason: undefined, message: undefined};
const CANCELED_ERROR = createLocalMFAError(REASON.LOCAL_ERRORS.CANCELED, 'user canceled');

type ScenarioCallbackCase = {
    /** Test name, and the `it` block's description. */
    name: string;
    scenarioName: MultifactorAuthenticationScenario;
    isSuccessful: boolean;
    scenarioResponse: MultifactorAuthenticationScenarioResponse | undefined;
    error: MFAError | undefined;
    payload: MultifactorAuthenticationScenarioAdditionalParams<MultifactorAuthenticationScenario> | undefined;
    expectedCallbackResponse: MultifactorAuthenticationCallbackResponse;

    /** Everything the callback is expected to have done - and, where it matters, not done. */
    verifySideEffects: () => void;
};

const cases: ScenarioCallbackCase[] = [
    {
        name: 'BIOMETRICS_TEST shows the outcome screen and touches nothing else',
        scenarioName: SCENARIO.BIOMETRICS_TEST,
        isSuccessful: true,
        scenarioResponse: SUCCESS_RESPONSE,
        error: undefined,
        payload: undefined,
        expectedCallbackResponse: CALLBACK_RESPONSE.SHOW_OUTCOME_SCREEN,
        verifySideEffects: () => {
            expect(Navigation.navigate).not.toHaveBeenCalled();
            expect(Navigation.goBack).not.toHaveBeenCalled();
            expect(setRevealedPhysicalCardPin).not.toHaveBeenCalled();
            expect(fireAndForgetDenyTransaction).not.toHaveBeenCalled();
        },
    },
    {
        name: 'REVEAL_PIN stores the revealed PIN and skips the outcome screen',
        scenarioName: SCENARIO.REVEAL_PIN,
        isSuccessful: true,
        scenarioResponse: {...SUCCESS_RESPONSE, body: {pin: REVEALED_PIN}},
        error: undefined,
        payload: {cardID: CARD_ID},
        expectedCallbackResponse: CALLBACK_RESPONSE.SKIP_OUTCOME_SCREEN,
        verifySideEffects: () => {
            expect(setRevealedPhysicalCardPin).toHaveBeenCalledWith(CARD_ID, REVEALED_PIN);
        },
    },
    {
        name: 'REVEAL_PIN stores nothing and shows the outcome screen on failure',
        scenarioName: SCENARIO.REVEAL_PIN,
        isSuccessful: false,
        scenarioResponse: undefined,
        error: CANCELED_ERROR,
        payload: {cardID: CARD_ID},
        expectedCallbackResponse: CALLBACK_RESPONSE.SHOW_OUTCOME_SCREEN,
        verifySideEffects: () => {
            expect(setRevealedPhysicalCardPin).not.toHaveBeenCalled();
        },
    },
    {
        name: 'SET_PERSONAL_DETAILS_AND_REVEAL_CARD_DETAILS stores the card secrets, leaves the details form, and skips the outcome screen',
        scenarioName: SCENARIO.SET_PERSONAL_DETAILS_AND_REVEAL_CARD_DETAILS,
        isSuccessful: true,
        scenarioResponse: {...SUCCESS_RESPONSE, body: {...REVEALED_CARD_DETAILS}},
        error: undefined,
        payload: {...PERSONAL_DETAILS, addressState: '', cardID: CARD_ID, isFromMissingDetailsFlow: true},
        expectedCallbackResponse: CALLBACK_RESPONSE.SKIP_OUTCOME_SCREEN,
        verifySideEffects: () => {
            expect(setRevealedVirtualCardDetails).toHaveBeenCalledWith(CARD_ID, REVEALED_CARD_DETAILS);
            expect(clearDraftValues).toHaveBeenCalledWith(ONYXKEYS.FORMS.PERSONAL_DETAILS_FORM);
            expect(Navigation.closeRHPFlow).toHaveBeenCalled();
            expect(Navigation.navigate).toHaveBeenCalledWith(ROUTES.SETTINGS_WALLET_DOMAIN_CARD.getRoute(CARD_ID));
        },
    },
    {
        name: 'SET_PERSONAL_DETAILS_AND_REVEAL_CARD_DETAILS stays put when the reveal was not entered from the missing-details form',
        scenarioName: SCENARIO.SET_PERSONAL_DETAILS_AND_REVEAL_CARD_DETAILS,
        isSuccessful: true,
        scenarioResponse: {...SUCCESS_RESPONSE, body: {...REVEALED_CARD_DETAILS}},
        error: undefined,
        payload: {...PERSONAL_DETAILS, addressState: '', cardID: CARD_ID},
        expectedCallbackResponse: CALLBACK_RESPONSE.SKIP_OUTCOME_SCREEN,
        verifySideEffects: () => {
            expect(setRevealedVirtualCardDetails).toHaveBeenCalledWith(CARD_ID, REVEALED_CARD_DETAILS);
            expect(Navigation.closeRHPFlow).not.toHaveBeenCalled();
            expect(Navigation.navigate).not.toHaveBeenCalled();
        },
    },
    {
        name: 'SET_PERSONAL_DETAILS_AND_REVEAL_CARD_DETAILS stores nothing and shows the outcome screen on failure',
        scenarioName: SCENARIO.SET_PERSONAL_DETAILS_AND_REVEAL_CARD_DETAILS,
        isSuccessful: false,
        scenarioResponse: undefined,
        error: CANCELED_ERROR,
        payload: {...PERSONAL_DETAILS, addressState: '', cardID: CARD_ID, isFromMissingDetailsFlow: true},
        expectedCallbackResponse: CALLBACK_RESPONSE.SHOW_OUTCOME_SCREEN,
        verifySideEffects: () => {
            expect(setRevealedVirtualCardDetails).not.toHaveBeenCalled();
            expect(Navigation.navigate).not.toHaveBeenCalled();
        },
    },
    {
        name: 'SET_PIN_ORDER_CARD lands the user on the card page and skips the outcome screen',
        scenarioName: SCENARIO.SET_PIN_ORDER_CARD,
        isSuccessful: true,
        scenarioResponse: SUCCESS_RESPONSE,
        error: undefined,
        payload: {...PERSONAL_DETAILS, pin: '5739', cardID: CARD_ID},
        expectedCallbackResponse: CALLBACK_RESPONSE.SKIP_OUTCOME_SCREEN,
        verifySideEffects: () => {
            expect(clearDraftValues).toHaveBeenCalledWith(ONYXKEYS.FORMS.PERSONAL_DETAILS_FORM);
            expect(Navigation.closeRHPFlow).toHaveBeenCalled();
            expect(Navigation.navigate).toHaveBeenCalledWith(ROUTES.SETTINGS_WALLET_DOMAIN_CARD.getRoute(CARD_ID));
        },
    },
    {
        name: 'SET_PIN_ORDER_CARD keeps the user in place and shows the outcome screen on failure',
        scenarioName: SCENARIO.SET_PIN_ORDER_CARD,
        isSuccessful: false,
        scenarioResponse: undefined,
        error: CANCELED_ERROR,
        payload: {...PERSONAL_DETAILS, pin: '5739', cardID: CARD_ID},
        expectedCallbackResponse: CALLBACK_RESPONSE.SHOW_OUTCOME_SCREEN,
        verifySideEffects: () => {
            expect(clearDraftValues).not.toHaveBeenCalled();
            expect(Navigation.navigate).not.toHaveBeenCalled();
        },
    },
    {
        name: 'CHANGE_PIN pops the set-PIN screen before the outcome screen is shown',
        scenarioName: SCENARIO.CHANGE_PIN,
        isSuccessful: true,
        scenarioResponse: SUCCESS_RESPONSE,
        error: undefined,
        payload: {pin: '1234', cardID: CARD_ID},
        expectedCallbackResponse: CALLBACK_RESPONSE.SHOW_OUTCOME_SCREEN,
        verifySideEffects: () => {
            expect(Navigation.goBack).toHaveBeenCalled();
        },
    },
    {
        name: 'CHANGE_PIN pops the set-PIN screen on failure too, so the failure screen is not stacked on it',
        scenarioName: SCENARIO.CHANGE_PIN,
        isSuccessful: false,
        scenarioResponse: undefined,
        error: CANCELED_ERROR,
        payload: {pin: '1234', cardID: CARD_ID},
        expectedCallbackResponse: CALLBACK_RESPONSE.SHOW_OUTCOME_SCREEN,
        verifySideEffects: () => {
            expect(Navigation.goBack).toHaveBeenCalled();
        },
    },
    {
        name: 'AUTHORIZE_TRANSACTION leaves an approved transaction alone and shows the outcome screen',
        scenarioName: SCENARIO.AUTHORIZE_TRANSACTION,
        isSuccessful: true,
        scenarioResponse: SUCCESS_RESPONSE,
        error: undefined,
        payload: {transactionID: TRANSACTION_ID},
        expectedCallbackResponse: CALLBACK_RESPONSE.SHOW_OUTCOME_SCREEN,
        verifySideEffects: () => {
            expect(fireAndForgetDenyTransaction).not.toHaveBeenCalled();
        },
    },
    {
        name: 'AUTHORIZE_TRANSACTION denies the transaction on failure so it cannot be approved elsewhere',
        scenarioName: SCENARIO.AUTHORIZE_TRANSACTION,
        isSuccessful: false,
        scenarioResponse: undefined,
        error: CANCELED_ERROR,
        payload: {transactionID: TRANSACTION_ID},
        expectedCallbackResponse: CALLBACK_RESPONSE.SHOW_OUTCOME_SCREEN,
        verifySideEffects: () => {
            expect(fireAndForgetDenyTransaction).toHaveBeenCalledWith({transactionID: TRANSACTION_ID});
        },
    },
];

/**
 * Builds the finalize-outcome input for one case, mirroring the mapping `mfaMachine`'s
 * `finalizingOutcome` invoke builds from context. That mapping itself - including its two deliberate
 * parity quirks with legacy - is pinned by `machine/finalizeOutcomeTransition.test.ts`.
 */
function buildInput(testCase: ScenarioCallbackCase): FinalizeOutcomeInput {
    return {
        isSuccessful: testCase.isSuccessful,
        callback: getScenarioConfig(testCase.scenarioName).callback,
        callbackInput: {
            httpStatusCode: testCase.scenarioResponse?.httpStatusCode,
            message: testCase.scenarioResponse?.reason ?? testCase.error?.reason,
            body: testCase.scenarioResponse?.body,
        },
        payload: testCase.payload,
        accountID: ACCOUNT_ID,
        scenarioName: testCase.scenarioName,
        scenarioResponse: testCase.scenarioResponse,
        error: testCase.error,
        authenticationMethod: undefined,
        isRegistrationComplete: false,
        softPromptApproved: false,
        registrationStateAtStart: undefined,
    };
}

describe('MFA scenario callbacks through the finalize-outcome actor', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('covers every scenario the app can run', () => {
        expect(new Set(cases.map((testCase) => testCase.scenarioName))).toEqual(new Set(Object.values(SCENARIO)));
    });

    it.each(cases)('$name', async (testCase) => {
        const {finalizeOutcome} = createActors();
        const actorRef = createActor(finalizeOutcome, {input: buildInput(testCase)});

        actorRef.start();
        await waitFor(actorRef, (snapshot) => snapshot.status !== 'active');

        expect(actorRef.getSnapshot().output).toEqual({callbackResponse: testCase.expectedCallbackResponse});
        testCase.verifySideEffects();
    });
});
