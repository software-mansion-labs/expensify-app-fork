import React, {useCallback, useRef} from 'react';
import type {OnyxEntry} from 'react-native-onyx';
import type {ValueOf} from 'type-fest';
import * as IOU from '@libs/actions/IOU';
import Navigation from '@libs/Navigation/Navigation';
import * as ReportUtils from '@libs/ReportUtils';
import MoneyRequestParticipantsSelector from '@pages/iou/steps/MoneyRequstParticipantsPage/MoneyRequestParticipantsSelector';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';
import type {Report} from '@src/types/onyx';

type ScanTabProps = {
    iou?: OnyxEntry<Report>;
};

// eslint-disable-next-line rulesdir/no-negated-variables
function ScanTab({iou}: ScanTabProps) {
    const transactionID = CONST.IOU.OPTIMISTIC_TRANSACTION_ID;
    const optimisticReportID = ReportUtils.generateReportID();
    const selectedReportID = useRef(optimisticReportID);

    const goToNextStep = useCallback(
        (iouType: ValueOf<typeof CONST.IOU.TYPE>) => {
            // const nextStepIOUType = numberOfParticipants.current === 1 ? CONST.IOU.TYPE.REQUEST : CONST.IOU.TYPE.SPLIT;
            IOU.initMoneyRequest(optimisticReportID, false, CONST.IOU.REQUEST_TYPE.SCAN);
            IOU.setMoneyRequestTag(transactionID, '');
            IOU.setMoneyRequestCategory(transactionID, '');
            Navigation.navigate(ROUTES.SHARE_SCAN_CONFIRM.getRoute(iouType, transactionID, selectedReportID.current || optimisticReportID));
        },
        [transactionID, optimisticReportID],
    );

    return (
        <MoneyRequestParticipantsSelector
            participants={iou?.participants ?? []}
            onAddParticipants={IOU.setMoneyRequestParticipants}
            onFinish={goToNextStep}
            navigateToRequest={() => goToNextStep(CONST.IOU.TYPE.REQUEST)}
            navigateToSplit={() => goToNextStep(CONST.IOU.TYPE.SPLIT)}
            iouType={CONST.IOU.TYPE.REQUEST}
            iouRequestType={CONST.IOU.REQUEST_TYPE.SCAN}
            isScanRequest
        />
    );
}

export default ScanTab;
