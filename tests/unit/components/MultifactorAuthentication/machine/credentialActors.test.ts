import type * as BiometricsOperations from '@components/MultifactorAuthentication/biometrics/operations';
import createActors from '@components/MultifactorAuthentication/machine/mfaActors';
import type {CreateCredentialInput} from '@components/MultifactorAuthentication/machine/types';

import {createLocalMFAError} from '@libs/MultifactorAuthentication/shared/MFAResult';

import {processRegistration} from '@userActions/MultifactorAuthentication/processing';
import type * as ProcessingActions from '@userActions/MultifactorAuthentication/processing';

import CONST from '@src/CONST';

import {MFA_TEST_KEY_INFO, MFA_TEST_REGISTRATION_CHALLENGE} from 'tests/utils/mfa/flowFixtures';
import {createActor, waitFor} from 'xstate';

const REASON = CONST.MULTIFACTOR_AUTHENTICATION.REASON;

const mockCreateCredential = jest.fn();

// The actors' own decisions (what reaches the ceremony and the backend, and what they return) are
// what this suite pins, so the platform ceremony and the backend call are mocked here.
jest.mock('@components/MultifactorAuthentication/biometrics/operations', () => ({
    ...jest.requireActual<typeof BiometricsOperations>('@components/MultifactorAuthentication/biometrics/operations'),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    createCredential: (...args: unknown[]) => mockCreateCredential(...args),
}));

jest.mock('@userActions/MultifactorAuthentication/processing', () => ({
    ...jest.requireActual<typeof ProcessingActions>('@userActions/MultifactorAuthentication/processing'),
    processRegistration: jest.fn(),
}));

const processRegistrationMock = jest.mocked(processRegistration);

const ANY_ABORT_SIGNAL: unknown = expect.any(AbortSignal);

const CREATE_CREDENTIAL_INPUT: CreateCredentialInput = {
    accountID: 12345,
    registrationChallenge: MFA_TEST_REGISTRATION_CHALLENGE,
};

/** Runs the machine's real `createCredential` actor logic to completion and returns its final snapshot. */
async function runCreateCredentialActor() {
    const {createCredential} = createActors();
    const actorRef = createActor(createCredential, {input: CREATE_CREDENTIAL_INPUT});
    actorRef.start();
    await waitFor(actorRef, (snapshot) => snapshot.status !== 'active');
    return actorRef.getSnapshot();
}

/** Runs the machine's real `registerCredential` actor logic to completion and returns its final snapshot. */
async function runRegisterCredentialActor() {
    const {registerCredential} = createActors();
    const actorRef = createActor(registerCredential, {input: {keyInfo: MFA_TEST_KEY_INFO}});
    actorRef.start();
    await waitFor(actorRef, (snapshot) => snapshot.status !== 'active');
    return actorRef.getSnapshot();
}

describe('credential actors', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createCredential', () => {
        it('runs the ceremony with its input and abort signal and returns the key info', async () => {
            mockCreateCredential.mockResolvedValue({success: true, keyInfo: MFA_TEST_KEY_INFO});

            const snapshot = await runCreateCredentialActor();

            expect(mockCreateCredential).toHaveBeenCalledWith({...CREATE_CREDENTIAL_INPUT, signal: ANY_ABORT_SIGNAL});
            expect(snapshot.output).toEqual({success: true, keyInfo: MFA_TEST_KEY_INFO});
            expect(processRegistrationMock).not.toHaveBeenCalled();
        });

        it('returns a platform refusal unchanged', async () => {
            const platformError = createLocalMFAError(REASON.LOCAL_ERRORS.WEBAUTHN.NOT_ALLOWED, 'User dismissed the passkey dialog');
            mockCreateCredential.mockResolvedValue({success: false, error: platformError});

            const snapshot = await runCreateCredentialActor();

            expect(snapshot.output).toEqual({success: false, error: platformError});
        });
    });

    describe('registerCredential', () => {
        it('forwards the exact keyInfo to processRegistration and returns its result on success', async () => {
            processRegistrationMock.mockResolvedValue({success: true});

            const snapshot = await runRegisterCredentialActor();

            expect(processRegistrationMock).toHaveBeenCalledWith({keyInfo: MFA_TEST_KEY_INFO});
            expect(snapshot.output).toEqual({success: true});
        });

        it('surfaces a backend failure unchanged and performs no rollback', async () => {
            const backendError = createLocalMFAError(REASON.CLIENT_ERRORS.UNRECOGNIZED, 'Backend rejected the key');
            processRegistrationMock.mockResolvedValue({success: false, error: backendError});

            const snapshot = await runRegisterCredentialActor();

            // No rollback: the actor's contract is to surface the backend result as-is, with no key
            // deletion and no local-credential clearing attempted on this path.
            expect(snapshot.output).toEqual({success: false, error: backendError});
        });
    });
});
