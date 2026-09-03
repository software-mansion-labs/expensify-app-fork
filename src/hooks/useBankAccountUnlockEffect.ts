import {isConciergeChatReport} from '@libs/ReportUtils';

import {initiateBankAccountUnlock} from '@userActions/BankAccounts';

import ONYXKEYS from '@src/ONYXKEYS';
import type {Report} from '@src/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

import useOnyx from './useOnyx';
import useScreenActivityEffect from './useScreenActivityEffect';

function useBankAccountUnlockEffect(report: OnyxEntry<Report> | undefined) {
    const [initiatingBankAccountUnlock] = useOnyx(ONYXKEYS.INITIATING_BANK_ACCOUNT_UNLOCK);
    const [conciergeReportID] = useOnyx(ONYXKEYS.CONCIERGE_REPORT_ID);

    // The unlock request stays recorded in Onyx after it is sent, so a covered screen must not treat its reveal as a
    // new request and send a second one with a second optimistic Concierge action.
    useScreenActivityEffect(() => {
        if (!isConciergeChatReport(report, conciergeReportID) || !initiatingBankAccountUnlock?.bankAccountIDToUnlock) {
            return;
        }
        initiateBankAccountUnlock(initiatingBankAccountUnlock.bankAccountIDToUnlock, conciergeReportID ?? undefined, initiatingBankAccountUnlock.optimisticReportActionID);
        // We only want to re-fire when reportID changes, not on every report field update
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initiatingBankAccountUnlock?.bankAccountIDToUnlock, report?.reportID]);
}

export default useBankAccountUnlockEffect;
