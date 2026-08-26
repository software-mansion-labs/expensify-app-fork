import {useClaimOnce} from '@hooks/useActivityIdentityGuard';
import useOnyx from '@hooks/useOnyx';

import TransitionTracker from '@libs/Navigation/TransitionTracker';
import {doesDeleteNavigateBackUrlIncludeDuplicatesReview} from '@libs/TransactionNavigationUtils';

import {clearDeleteTransactionNavigateBackUrl} from '@userActions/Report';

import ONYXKEYS from '@src/ONYXKEYS';

import {useIsFocused} from '@react-navigation/native';
import {useEffect} from 'react';

/**
 * Component that does not render anything but isolates the NVP_DELETE_TRANSACTION_NAVIGATE_BACK_URL
 * subscription from ReportScreen. Clears the URL after interactions complete
 * when the report is no longer focused.
 */
function DeleteTransactionNavigateBackHandler() {
    const isFocused = useIsFocused();
    const [deleteTransactionNavigateBackUrl] = useOnyx(ONYXKEYS.NVP_DELETE_TRANSACTION_NAVIGATE_BACK_URL);
    const claimClearForUrl = useClaimOnce();

    useEffect(() => {
        if (!deleteTransactionNavigateBackUrl || doesDeleteNavigateBackUrlIncludeDuplicatesReview(deleteTransactionNavigateBackUrl)) {
            return;
        }

        // The claim keeps the blur branch and the teardown branch from both scheduling a clear for the same URL.
        const scheduleClear = () => {
            if (!claimClearForUrl(deleteTransactionNavigateBackUrl)) {
                return null;
            }
            // Clear the URL only after we navigate away to avoid a brief Not Found flash.
            return TransitionTracker.runAfterTransitions({
                callback: () => {
                    requestAnimationFrame(clearDeleteTransactionNavigateBackUrl);
                },
                waitForUpcomingTransition: true,
            });
        };

        if (!isFocused) {
            const handle = scheduleClear();
            return () => handle?.cancel();
        }

        // Losing focus is what the clear waits for, and it is also the commit in which a covered screen tears
        // this effect down, so the teardown is the one place both behaviors reach.
        return () => {
            scheduleClear();
        };
    }, [isFocused, deleteTransactionNavigateBackUrl, claimClearForUrl]);

    return null;
}

DeleteTransactionNavigateBackHandler.displayName = 'DeleteTransactionNavigateBackHandler';

export default DeleteTransactionNavigateBackHandler;
