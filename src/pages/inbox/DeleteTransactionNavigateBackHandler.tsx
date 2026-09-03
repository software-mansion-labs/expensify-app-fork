import useOnyx from '@hooks/useOnyx';

import type {CancelHandle} from '@libs/Navigation/TransitionTracker';
import TransitionTracker from '@libs/Navigation/TransitionTracker';
import {doesDeleteNavigateBackUrlIncludeDuplicatesReview} from '@libs/TransactionNavigationUtils';

import {clearDeleteTransactionNavigateBackUrl} from '@userActions/Report';

import ONYXKEYS from '@src/ONYXKEYS';

import {useIsFocused} from '@react-navigation/native';
import {useEffect, useRef} from 'react';

/**
 * Component that does not render anything but isolates the NVP_DELETE_TRANSACTION_NAVIGATE_BACK_URL
 * subscription from ReportScreen. Clears the URL after interactions complete
 * when the report is no longer focused.
 */
function DeleteTransactionNavigateBackHandler() {
    const isFocused = useIsFocused();
    const [deleteTransactionNavigateBackUrl] = useOnyx(ONYXKEYS.NVP_DELETE_TRANSACTION_NAVIGATE_BACK_URL);
    const pendingClearHandleRef = useRef<CancelHandle | undefined>(undefined);

    useEffect(() => {
        if (!deleteTransactionNavigateBackUrl) {
            return;
        }
        if (doesDeleteNavigateBackUrlIncludeDuplicatesReview(deleteTransactionNavigateBackUrl)) {
            return;
        }
        // Clear the URL only after we navigate away to avoid a brief Not Found flash.
        const scheduleClear = () => {
            pendingClearHandleRef.current = TransitionTracker.runAfterTransitions({
                callback: () => {
                    pendingClearHandleRef.current = undefined;
                    requestAnimationFrame(clearDeleteTransactionNavigateBackUrl);
                },
                waitForUpcomingTransition: true,
            });
        };

        if (isFocused) {
            // A screen that gets covered stops running its effects in the very commit that blurs it, so the teardown
            // of the focused run is the only point that both a plain blur and a cover reach.
            pendingClearHandleRef.current?.cancel();
            pendingClearHandleRef.current = undefined;
            return scheduleClear;
        }

        // A blur that already scheduled the clear from the teardown above only needs this run to keep it cancellable.
        if (!pendingClearHandleRef.current) {
            scheduleClear();
        }
        return () => {
            pendingClearHandleRef.current?.cancel();
            pendingClearHandleRef.current = undefined;
        };
    }, [isFocused, deleteTransactionNavigateBackUrl]);

    return null;
}

DeleteTransactionNavigateBackHandler.displayName = 'DeleteTransactionNavigateBackHandler';

export default DeleteTransactionNavigateBackHandler;
