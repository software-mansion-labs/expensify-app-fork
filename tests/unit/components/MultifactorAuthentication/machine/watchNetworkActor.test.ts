import type {MfaEvent} from '@components/MultifactorAuthentication/machine/types';
import watchNetwork from '@components/MultifactorAuthentication/machine/watchNetwork';

import * as NetworkState from '@libs/NetworkState';
import {setForceOffline} from '@libs/NetworkState';

import {assign, createActor, setup} from 'xstate';

type NetworkEvent = Extract<MfaEvent, {type: 'NETWORK_OFFLINE' | 'NETWORK_ONLINE'}>;

/** A parent that records every event the watcher sends back, so the test reads exactly what the MFA machine would receive. */
const recordingParent = setup({
    // `{} as T` inside setup({types}) is XState v5's typing idiom (the values are erased at runtime).
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    types: {context: {} as {received: Array<NetworkEvent['type']>}, events: {} as NetworkEvent},
    actors: {watchNetwork},
}).createMachine({
    context: {received: []},
    invoke: {src: 'watchNetwork'},
    on: {
        NETWORK_OFFLINE: {actions: assign({received: ({context, event}) => [...context.received, event.type]})},
        NETWORK_ONLINE: {actions: assign({received: ({context, event}) => [...context.received, event.type]})},
    },
});

function startWatching() {
    const actor = createActor(recordingParent);
    actor.start();
    return {actor, getReceived: () => actor.getSnapshot().context.received};
}

describe('watchNetwork actor', () => {
    afterEach(() => {
        setForceOffline(false);
    });

    it('sends nothing on start while online', () => {
        // Given the device is online, which is the network region's initial state
        // When the watcher starts
        const {actor, getReceived} = startWatching();

        // Then it sends nothing, because an extra NETWORK_ONLINE would only repeat what the machine already assumes
        expect(getReceived()).toEqual([]);

        actor.stop();
    });

    it('sends NETWORK_OFFLINE on start while offline', () => {
        // Given the device is already offline when the flow opens
        setForceOffline(true);

        // When the watcher starts
        const {actor, getReceived} = startWatching();

        // Then it reports offline right away, so the flow pauses before its first network step
        expect(getReceived()).toEqual(['NETWORK_OFFLINE']);

        actor.stop();
    });

    it('sends one event per change and ignores repeated updates', () => {
        // Given the watcher runs while online
        const {actor, getReceived} = startWatching();

        // When the network state updates several times, including updates that don't change the status
        setForceOffline(true);
        setForceOffline(true);
        setForceOffline(false);
        setForceOffline(false);

        // Then only the two real changes reach the machine, because NetworkState notifies on every update
        expect(getReceived()).toEqual(['NETWORK_OFFLINE', 'NETWORK_ONLINE']);

        actor.stop();
    });

    it('unsubscribes once stopped', () => {
        // Given the watcher is subscribed to the network state
        const unsubscribe = jest.fn();
        const subscribeSpy = jest.spyOn(NetworkState, 'subscribe').mockReturnValue(unsubscribe);
        const {actor} = startWatching();
        expect(subscribeSpy).toHaveBeenCalledTimes(1);

        // When the flow leaves `open` and the watcher stops
        actor.stop();

        // Then it unsubscribes, so a closed flow never keeps a listener behind
        expect(unsubscribe).toHaveBeenCalledTimes(1);

        subscribeSpy.mockRestore();
    });
});
