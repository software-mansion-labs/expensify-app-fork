import type { OnyxEntry } from 'react-native-onyx';
import useOnyx from '@hooks/useOnyx';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ReportAction, ReportActions} from '@src/types/onyx';


function getApproveTransactionActions(allActions: OnyxEntry<ReportActions>) {
    if (!allActions) {return {};}

    const entries = Object.entries(allActions);

    return entries.reduce((previousValue, currentValue) => {
        const [key, action] = currentValue;

        if (action.actionName === CONST.REPORT.ACTIONS.TYPE.MULTIFACTOR_AUTHENTICATION.TRANSACTION_APPROVAL) {
            // eslint-disable-next-line no-param-reassign
            previousValue[key] = action;
        }

        return previousValue;
    }, {} as ReportActions);
}

function useApproveTransactionReportActions(): void {
    const [conciergeReportID] = useOnyx(ONYXKEYS.CONCIERGE_REPORT_ID);
    const [reportActions] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${conciergeReportID}`, {
        canBeMissing: true,
        selector: getApproveTransactionActions,
    });

    console.log(reportActions);
}

export default useApproveTransactionReportActions;
