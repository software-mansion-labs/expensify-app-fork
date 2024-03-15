import {View} from 'react-native';
import MenuItemWithTopDescription from '@components/MenuItemWithTopDescription';
import OfflineWithFeedback from '@components/OfflineWithFeedback';
import useStyleUtils from '@hooks/useStyleUtils';
import useWindowDimensions from '@hooks/useWindowDimensions';
import * as ReportUtils from '@libs/ReportUtils';
import AnimatedEmptyStateBackground from '@pages/home/report/AnimatedEmptyStateBackground';
import type {Report} from '@src/types/onyx';

type TripDetailsViewProps = {
    /** The report currently being looked at */
    report: Report;
};

function TripDetailsView({report}: TripDetailsViewProps) {
    const transactions = ReportUtils.getTripTransactions(report.reportID);
    const StyleUtils = useStyleUtils();
    const {isSmallScreenWidth} = useWindowDimensions();

    return (
        <View style={[StyleUtils.getReportWelcomeContainerStyle(isSmallScreenWidth, true)]}>
            <AnimatedEmptyStateBackground />
            <View style={[StyleUtils.getReportWelcomeTopMarginStyle(isSmallScreenWidth, true)]}>
                {!ReportUtils.isClosedExpenseReportWithNoExpenses(report) &&
                    ReportUtils.reportFieldsEnabled(report) &&
                    transactions.map((transaction) => (
                        <OfflineWithFeedback>
                            <MenuItemWithTopDescription />
                        </OfflineWithFeedback>
                    ))}
            </View>
        </View>
    );
}

TripDetailsView.displayName = 'TripDetailsView';

export default TripDetailsView;
