import {isConciergeChatReport} from '@libs/ReportUtils';

import {initiateBankAccountUnlock} from '@userActions/BankAccounts';

import ONYXKEYS from '@src/ONYXKEYS';
import type {Report} from '@src/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

import {useEffect} from 'react';

import {useLastApplied} from './useActivityIdentityGuard';
import useOnyx from './useOnyx';

function useBankAccountUnlockEffect(report: OnyxEntry<Report> | undefined) {
    const [initiatingBankAccountUnlock] = useOnyx(ONYXKEYS.INITIATING_BANK_ACCOUNT_UNLOCK);
    const [conciergeReportID] = useOnyx(ONYXKEYS.CONCIERGE_REPORT_ID);
    const hasUnlockRequestChanged = useLastApplied();

    useEffect(() => {
        if (
            !hasUnlockRequestChanged(
                initiatingBankAccountUnlock?.bankAccountIDToUnlock && report?.reportID ? `${initiatingBankAccountUnlock.bankAccountIDToUnlock}|${report.reportID}` : undefined,
            )
        ) {
            return;
        }
        if (!isConciergeChatReport(report, conciergeReportID) || !initiatingBankAccountUnlock?.bankAccountIDToUnlock) {
            return;
        }
        initiateBankAccountUnlock(initiatingBankAccountUnlock.bankAccountIDToUnlock, conciergeReportID ?? undefined, initiatingBankAccountUnlock.optimisticReportActionID);
        // We only want to re-fire when reportID changes, not on every report field update
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initiatingBankAccountUnlock?.bankAccountIDToUnlock, report?.reportID, hasUnlockRequestChanged]);
}

export default useBankAccountUnlockEffect;
