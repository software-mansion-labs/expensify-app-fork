/**
 * Sends the read that the open page of a flow needs. Each position is its own screen, so the page opens when the screen
 * mounts. The read is sent then, again when its data disappears, such as a token that a failed write clears, and again
 * after each reconnect until the read of this page succeeded, because a read made offline is not sent at all. The read
 * is sent on open even when its data is already stored, because a key without a country, such as the picklists, may
 * hold the data of another country.
 */
import useNetwork from '@hooks/useNetwork';

import {useEffect, useEffectEvent, useRef, useState} from 'react';

import type {RequestKey} from './requestKey';
import type {PlannedRead, RequestOutcome} from './types';

import useRequestState from './useRequestState';

type ReadOnOpenState = {
    isPending: boolean;

    /** The last read that this page sent failed. A failure that an earlier visit saw does not count, so a page opened offline waits for the reconnect. */
    hasFailed: boolean;
};

/** The controller passes no read while the open page has none or the data of the plan is not there yet */
function useReadOnOpen(read: PlannedRead | undefined): ReadOnOpenState {
    const key = read?.key;
    const isLoaded = !!read?.isLoaded;
    const {isPending, errors} = useRequestState(key);
    const [hasOwnReadFailed, setHasOwnReadFailed] = useState(false);

    // The read that this page sent last, while it is pending or after it succeeded. It is empty while the page still owes a read.
    const ownReadRef = useRef<Promise<RequestOutcome> | undefined>(undefined);

    // The key that this page read last. Data that arrives for it needs no new read, so only an open, a new key or lost data send one.
    const readKeyRef = useRef<RequestKey | undefined>(undefined);

    const sendRead = () => {
        if (!read) {
            return;
        }
        const ownRead = read.send();
        ownReadRef.current = ownRead;
        ownRead.then((outcome) => {
            // A newer read of this page replaced this one, so only the newer one says whether the page still owes a read
            if (ownReadRef.current !== ownRead) {
                return;
            }
            setHasOwnReadFailed(outcome.status === 'failed');
            if (outcome.status === 'succeeded') {
                return;
            }
            ownReadRef.current = undefined;
        });
    };

    const sendReadOnChange = useEffectEvent(sendRead);

    useEffect(() => {
        if (!key || (isLoaded && readKeyRef.current === key)) {
            return;
        }
        readKeyRef.current = key;
        sendReadOnChange();
    }, [key, isLoaded]);

    useNetwork({
        onReconnect: () => {
            if (ownReadRef.current) {
                return;
            }
            sendRead();
        },
    });

    // A new attempt clears the errors of the key while it is pending, so an older failure of this page does not show then
    return {isPending, hasFailed: hasOwnReadFailed && !!errors};
}

export default useReadOnOpen;
