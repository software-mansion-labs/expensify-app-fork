import {feedLhnOrderIndex, getLhnOrderSnapshot, subscribeToLhnOrder} from '@libs/LhnOrderIndex/LhnOrderIndexStore';
import type {LhnIndexInputs, LhnOrderSnapshot} from '@libs/LhnOrderIndex/types';
import type {LhnPriorityMode} from '@libs/SqlEngine/wasm/protocol';

import {useEffect, useState} from 'react';

type UseLhnOrderParams = {
    /** False in the `off` mode, where the hook does nothing at all and the sidebar sorts in JS. */
    isEnabled: boolean;
    inputs: LhnIndexInputs;
    priorityMode: LhnPriorityMode;
};

/**
 * The LHN order as the SQL engine last returned it, or `undefined` until the first order arrives. The caller keeps
 * showing the previous order while a round trip is in flight, which is what makes the ordering asynchronous: a
 * write reaches the screen one tick later than it does today, and no write costs a full sort on the main thread.
 */
function useLhnOrder({isEnabled, inputs, priorityMode}: UseLhnOrderParams): LhnOrderSnapshot | undefined {
    const [snapshot, setSnapshot] = useState(getLhnOrderSnapshot);

    useEffect(() => subscribeToLhnOrder(() => setSnapshot(getLhnOrderSnapshot())), []);

    useEffect(() => {
        if (!isEnabled) {
            return;
        }
        feedLhnOrderIndex(inputs, priorityMode);
    }, [isEnabled, inputs, priorityMode]);

    return isEnabled ? snapshot : undefined;
}

export default useLhnOrder;
