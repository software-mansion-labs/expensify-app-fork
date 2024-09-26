import React, {useCallback, useRef} from 'react';
import {withOnyx} from 'react-native-onyx';
import type {OnyxEntry} from 'react-native-onyx';
import * as IOU from '@libs/actions/IOU';
import Navigation from '@libs/Navigation/Navigation';
import * as ReportUtils from '@libs/ReportUtils';
import MoneyRequestParticipantsSelector from '@pages/iou/request/MoneyRequestParticipantsSelector';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import type {Transaction} from '@src/types/onyx';
import type {Participant} from '@src/types/onyx/IOU';

type ScanTabOnyxProps = {
    transaction?: OnyxEntry<Transaction>;
};

type ScanTabProps = ScanTabOnyxProps;

// eslint-disable-next-line rulesdir/no-negated-variables
function ScanTab({transaction}: ScanTabProps) {
    const transactionID = CONST.IOU.OPTIMISTIC_TRANSACTION_ID;
    const optimisticReportID = ReportUtils.generateReportID();
    const selectedReportID = useRef(optimisticReportID);
    const numberOfParticipants = useRef(transaction?.participants?.length);

    const goToNextStep = useCallback(() => {
        const nextStepIOUType = numberOfParticipants.current === 1 ? CONST.IOU.TYPE.REQUEST : CONST.IOU.TYPE.SPLIT;
        IOU.initMoneyRequest(optimisticReportID, false, CONST.IOU.REQUEST_TYPE.SCAN);
        IOU.setMoneyRequestTag(transactionID, '');
        IOU.setMoneyRequestCategory(transactionID, '');
        IOU.setMoneyRequestParticipants(transactionID, transaction?.participants ?? []);
        Navigation.navigate(ROUTES.SHARE_SCAN_CONFIRM.getRoute(nextStepIOUType, transactionID, selectedReportID.current || optimisticReportID));
    }, [optimisticReportID, transactionID, transaction?.participants]);

    const addParticipant = useCallback(
        (val: Participant[]) => {
            IOU.setMoneyRequestParticipants(transactionID, val);
            numberOfParticipants.current = val.length;

            // When multiple participants are selected, the reportID is generated at the end of the confirmation step.
            // So we are resetting selectedReportID ref to the reportID coming from params.
            if (val.length !== 1) {
                selectedReportID.current = optimisticReportID;
                return;
            }

            // When a participant is selected, the reportID needs to be saved because that's the reportID that will be used in the confirmation step.
            selectedReportID.current = val?.[0].reportID ?? optimisticReportID;
        },
        [optimisticReportID, transactionID],
    );

    return (
        <MoneyRequestParticipantsSelector
            participants={transaction?.participants ?? []}
            onAddParticipants={addParticipant}
            navigateToRequest={goToNextStep}
            navigateToSplit={goToNextStep}
            iouType={CONST.IOU.TYPE.REQUEST}
            isScanRequest
        />
    );
}

export default withOnyx<ScanTabProps, ScanTabOnyxProps>({
    transaction: {
        key: `${ONYXKEYS.COLLECTION.TRANSACTION_DRAFT}${CONST.IOU.OPTIMISTIC_TRANSACTION_ID}`,
    },
})(ScanTab);
