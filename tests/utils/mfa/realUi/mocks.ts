import {fromPromise} from 'xstate';
import type {UseBiometricsReturn} from '@components/MultifactorAuthentication/biometrics/shared/types';
import type createActors from '@components/MultifactorAuthentication/machine/mfaActors';
import type {ValidateDeviceInput} from '@components/MultifactorAuthentication/machine/types';
import type {ActorOutcome} from '../flowPaths';

// This module keeps mutable mock state and factory bodies outside the test so the test stays focused on
// mock registrations and assertions.

type CapturedCallback = () => void;

let pendingCloseCallback: CapturedCallback | undefined;

/**
 * Captures the navigator's close callback so the test can observe `closing` before driving
 * `MODAL_CLOSED`.
 */
const pendingModalClose = {
    capture: (callback: CapturedCallback) => {
        pendingCloseCallback = callback;
    },
    run: () => {
        const callback = pendingCloseCallback;
        pendingCloseCallback = undefined;
        callback?.();
    },
    clear: () => {
        pendingCloseCallback = undefined;
    },
};

/**
 * Provides only the biometric values read during `INIT`. The `Pick` makes renamed hook fields fail type
 * checking.
 */
const biometricsMock: Pick<UseBiometricsReturn, 'serverKnownCredentialIDs' | 'areLocalCredentialsKnownToServer'> = {
    serverKnownCredentialIDs: [],
    areLocalCredentialsKnownToServer: () => Promise.resolve(false),
};

/**
 * Per-path outcomes for the mock actors the walk provides, keyed by actor id. The walk sets this from a
 * path's graph events before rendering, so an `xstate.error.actor.<id>` step makes that actor reject and
 * an `xstate.done.actor.<id>` step makes it resolve. Unlisted actors default to resolving.
 */
let actorOutcomes: Record<string, ActorOutcome> = {};

function setActorOutcomes(outcomes: Record<string, ActorOutcome>) {
    actorOutcomes = outcomes;
}

function getActorOutcome(actorId: string): ActorOutcome {
    return actorOutcomes[actorId] ?? 'resolve';
}

function resetMfaUiMocks() {
    pendingModalClose.clear();
    biometricsMock.serverKnownCredentialIDs = [];
    actorOutcomes = {};
}

function makeActorMock<TInput>(actorID: string) {
    return fromPromise<void, TInput>(async () => {
        if (getActorOutcome(actorID) !== 'reject') {
            return;
        }
        throw new Error(`Mock MFA actor "${actorID}" rejected for this path`);
    });
}

/**
 * Replaces the machine's side-effect actors with graph-driven promises. `satisfies` makes adding a real
 * actor a type error here until the UI walk defines its mock.
 */
function mfaActorsMock() {
    const actors = {
        validateDevice: makeActorMock<ValidateDeviceInput>('validateDevice'),
    } satisfies ReturnType<typeof createActors>;

    return {
        __esModule: true,
        default: () => actors,
    };
}

function biometricsHookMock() {
    return {
        __esModule: true,
        default: () => biometricsMock,
    };
}

function renderHtmlMock() {
    return {
        __esModule: true,
        default: () => null,
    };
}

function syncHistoryMock() {
    return {
        __esModule: true,
        default: () => {},
    };
}

/**
 * Reuses the shared Navigation stubs and overrides the two transition methods the flow needs to observe.
 * `runAfterTransition` runs its callback immediately because jsdom has no real transition, while
 * `runAfterUpcomingTransition` captures the teardown callback so the `closing` state stays observable.
 * Missing methods remain undefined so new dependencies fail explicitly.
 */
function navigationMock() {
    const sharedNavigationMock = jest.requireActual<{default: Record<string, unknown>}>('@libs/Navigation/__mocks__/Navigation').default;
    return {
        __esModule: true,
        default: {
            ...sharedNavigationMock,
            runAfterTransition: (callback: () => void) => {
                callback();
                return {cancel: () => {}};
            },
            runAfterUpcomingTransition: (callback: () => void) => {
                pendingModalClose.capture(callback);
                return {cancel: () => pendingModalClose.clear()};
            },
        },
    };
}

export {pendingModalClose, biometricsMock, setActorOutcomes, resetMfaUiMocks, mfaActorsMock, biometricsHookMock, renderHtmlMock, syncHistoryMock, navigationMock};
