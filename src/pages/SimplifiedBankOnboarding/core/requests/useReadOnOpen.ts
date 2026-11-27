/**
 * Sends the read that the open page of a flow needs. Each position is its own screen, so the page opens when the screen
 * mounts. The read is sent then, and again after each reconnect until the read of this page succeeded, because a read
 * made offline is not sent at all. The read is sent even when its data is already stored, because a key without a
 * country, such as the picklists, may hold the data of another country.
 */
import useNetwork from '@hooks/useNetwork';

import {useEffect, useEffectEvent, useRef} from 'react';

import type {PlannedRead, RequestOutcome} from './types';

import useRequestState from './useRequestState';

type ReadOnOpenState = {
    isPending: boolean;

    /** The last read with the key of this read failed */
    hasFailed: boolean;
};

/** The controller passes no read while the open page has none or the data of the plan is not there yet */
function useReadOnOpen(read: PlannedRead | undefined): ReadOnOpenState {
    const key = read?.key;
    const {isPending, errors} = useRequestState(key);

    // The read that this page sent last, while it is pending or after it succeeded. It is empty while the page still owes a read.
    const ownReadRef = useRef<Promise<RequestOutcome> | undefined>(undefined);

    const sendRead = () => {
        if (!read) {
            return;
        }
        const ownRead = read.send();
        ownReadRef.current = ownRead;
        ownRead.then((outcome) => {
            // A newer read of this page replaced this one, so only the newer one says whether the page still owes a read
            if (ownReadRef.current !== ownRead || outcome.status === 'succeeded') {
                return;
            }
            ownReadRef.current = undefined;
        });
    };

    const sendReadOnOpen = useEffectEvent(sendRead);

    useEffect(() => {
        if (!key) {
            return;
        }
        sendReadOnOpen();
    }, [key]);

    useNetwork({
        onReconnect: () => {
            if (ownReadRef.current) {
                return;
            }
            sendRead();
        },
    });

    return {isPending, hasFailed: !!errors};
}

export default useReadOnOpen;
