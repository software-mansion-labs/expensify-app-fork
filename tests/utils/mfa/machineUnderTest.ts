import {createActor} from 'xstate';
import mfaMachine from '@components/MultifactorAuthentication/machine/mfaMachine';

type MfaActionSpies = {
    navigateToSuccessOutcome: jest.Mock;
    clearModalOpenNavigationState: jest.Mock;
};

function createMfaActionSpies(): MfaActionSpies {
    return {
        navigateToSuccessOutcome: jest.fn(),
        clearModalOpenNavigationState: jest.fn(),
    };
}

// Stubs only the actions that reach Navigation; context-only actions stay real.
function buildMfaTestMachine(spies: MfaActionSpies) {
    return mfaMachine.provide({
        actions: {
            navigateToSuccessOutcome: spies.navigateToSuccessOutcome,
            clearModalOpenNavigationState: spies.clearModalOpenNavigationState,
        },
    });
}

function createMfaTestActor() {
    const spies = createMfaActionSpies();
    const actor = createActor(buildMfaTestMachine(spies));
    actor.start();
    return {actor, spies};
}

export default createMfaTestActor;
export {buildMfaTestMachine, createMfaActionSpies};
export type {MfaActionSpies};
