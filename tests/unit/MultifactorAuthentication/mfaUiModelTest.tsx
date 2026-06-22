/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return -- jest.mock factories delegate to require()'d helpers, which resolve as `any`. */
import {resetMfaNavigation} from '@components/MultifactorAuthentication/mfaNavigation';
import CONST from '@src/CONST';
import createMfaTestModel from '../../utils/mfa/createMfaTestModel';
import mfaEventExecutors from '../../utils/mfa/ui/eventExecutors';
import {flushMfaUi, isModalOverlayMounted, isOutcomeScreenVisible, renderMfaUi} from '../../utils/mfa/ui/harness';
import {resetMfaUiMocks} from '../../utils/mfa/ui/mocks';

// Wide layout so the navigator renders the backdrop overlay the assertions use as the mounted marker.
jest.mock('@hooks/useResponsiveLayout');
// Dev-only Stately inspector wiring -> the plain @xstate/react adapter the provider needs.
jest.mock('@hooks/useInspectedMachine', () => require('../../utils/mfa/ui/jestMocks').inspectedMachineMock());
// Native / WebAuthn biometrics are out of scope for the modal-lifecycle contract.
jest.mock('@components/MultifactorAuthentication/biometrics/useBiometrics', () => require('../../utils/mfa/ui/jestMocks').biometricsHookMock());
// Browser/Android back-history wiring is a separate concern from the machine <-> UI contract.
jest.mock('@components/MultifactorAuthentication/useSyncMfaModalNavigatorWithHistory', () => require('../../utils/mfa/ui/jestMocks').syncHistoryMock());
// Navigation automock leaves methods undefined; supply the three the flow needs and no-op the rest.
jest.mock('@libs/Navigation/Navigation', () => require('../../utils/mfa/ui/jestMocks').navigationMock());

const MFA_STATE = CONST.MULTIFACTOR_AUTHENTICATION.MFA_STATE;

const testModel = createMfaTestModel();

// The createTestModel-style config: events map -> UI gesture, states map -> per-state assertion.
// State keys are dot-path values matched with `matchesState`, so they can target any depth - here the
// settled success leaf `open.outcome.success` rather than just the `open` parent.
const testConfig = {
    events: mfaEventExecutors,
    states: {
        [MFA_STATE.CLOSED]: () => {
            expect(isModalOverlayMounted()).toBe(false);
            expect(isOutcomeScreenVisible()).toBe(false);
        },
        [`${MFA_STATE.OPEN}.${MFA_STATE.OUTCOME}.${MFA_STATE.SUCCESS}`]: () => {
            expect(isModalOverlayMounted()).toBe(true);
            expect(isOutcomeScreenVisible()).toBe(true);
        },
        [MFA_STATE.CLOSING]: () => {
            expect(isModalOverlayMounted()).toBe(true);
            expect(isOutcomeScreenVisible()).toBe(false);
        },
    },
};

describe('mfaMachine driven through the real MFA UI', () => {
    beforeEach(() => {
        resetMfaUiMocks();
        resetMfaNavigation();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // getSimplePaths reaches every state; the lifecycle lap adds the MODAL_CLOSED teardown it skips.
    const paths = [...testModel.getSimplePaths(), ...testModel.getLifecyclePaths()];

    for (const path of paths) {
        it(`reaches ${JSON.stringify(path.state.value)} via [${path.description}]`, async () => {
            renderMfaUi();
            await flushMfaUi();
            await path.test(testConfig);
        });
    }
});
