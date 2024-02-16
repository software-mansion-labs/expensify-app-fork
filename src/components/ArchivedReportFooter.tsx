/* eslint-disable rulesdir/prefer-actions-set-data */
import lodashEscape from 'lodash/escape';
import React from 'react';
import type {OnyxEntry} from 'react-native-onyx';
import Onyx, {withOnyx} from 'react-native-onyx';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import * as PersonalDetailsUtils from '@libs/PersonalDetailsUtils';
import * as ReportActionsUtils from '@libs/ReportActionsUtils';
import * as ReportUtils from '@libs/ReportUtils';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {PersonalDetailsList, Report, ReportAction} from '@src/types/onyx';
import Banner from './Banner';

type ArchivedReportFooterOnyxProps = {
    /** The reason this report was archived */
    reportClosedAction: OnyxEntry<ReportAction>;

    /** Personal details of all users */
    personalDetails: OnyxEntry<PersonalDetailsList>;

    policyID: string;
};

type ArchivedReportFooterProps = ArchivedReportFooterOnyxProps & {
    /** The archived report */
    report: Report;
};

function ArchivedReportFooter({policyID, report, reportClosedAction, personalDetails = {}}: ArchivedReportFooterProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();

    const originalMessage = reportClosedAction?.actionName === CONST.REPORT.ACTIONS.TYPE.CLOSED ? reportClosedAction.originalMessage : null;
    const archiveReason = originalMessage?.reason ?? CONST.REPORT.ARCHIVE_REASON.DEFAULT;
    let displayName = PersonalDetailsUtils.getDisplayNameOrDefault(personalDetails?.[report?.ownerAccountID ?? 0]);

    let oldDisplayName: string | undefined;
    if (archiveReason === CONST.REPORT.ARCHIVE_REASON.ACCOUNT_MERGED) {
        const newAccountID = originalMessage?.newAccountID;
        const oldAccountID = originalMessage?.oldAccountID;
        displayName = PersonalDetailsUtils.getDisplayNameOrDefault(personalDetails?.[newAccountID ?? 0]);
        oldDisplayName = PersonalDetailsUtils.getDisplayNameOrDefault(personalDetails?.[oldAccountID ?? 0]);
    }

    const shouldRenderHTML = archiveReason !== CONST.REPORT.ARCHIVE_REASON.DEFAULT;

    let policyName = ReportUtils.getPolicyName(report);

    if (shouldRenderHTML) {
        oldDisplayName = lodashEscape(oldDisplayName);
        displayName = lodashEscape(displayName);
        policyName = lodashEscape(policyName);
    }

    const text = shouldRenderHTML
        ? translate(`reportArchiveReasons.${archiveReason}`, {
              displayName: `<strong>${displayName}</strong>`,
              oldDisplayName: `<strong>${oldDisplayName}</strong>`,
              policyName: `<strong>${policyName}</strong>`,
          })
        : translate(`reportArchiveReasons.${archiveReason}`);

    return (
        <Banner
            containerStyles={[styles.archivedReportFooter]}
            text={text}
            shouldRenderHTML={shouldRenderHTML}
            shouldShowIcon
            shouldShowCloseButton
            onClose={() => {
                // Onyx.set(ONYXKEYS.POLICY_ID, policyID === '1576B20B2BA20523' ? '4EB3958A3E59A354' : '1576B20B2BA20523');
                Onyx.set(ONYXKEYS.POLICY_ID, policyID === '1576B20B2BA20523' ? 'undefined' : '1576B20B2BA20523');
                // Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {name: Math.random().toString()});
                // Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, null);
                // Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${policyID}`, {name: policyID === '1576B20B2BA20523' ? '4EB3958A3E59A354' : '1576B20B2BA20523'});
                // Onyx.merge(`${ONYXKEYS.COLLECTION.POLICY}${'test2'}`, {
                //     isFromFullPolicy: false,
                //     id: 'test2',
                //     name: '0.6415550731600059',
                //     role: 'admin',
                //     type: 'free',
                //     owner: '0.2669946236723346',
                //     ownerAccountID: 14357020,
                //     outputCurrency: 'EUR',
                //     avatar: '',
                //     employeeList: [],
                //     isPolicyExpenseChatEnabled: true,
                //     chatReportIDAnnounce: 1038301144060652,
                //     chatReportIDAdmins: 5618866612197321,
                // });
            }}
        />
    );
}

ArchivedReportFooter.displayName = 'ArchivedReportFooter';

export default withOnyx<ArchivedReportFooterProps, ArchivedReportFooterOnyxProps>({
    policyID: {
        key: ONYXKEYS.POLICY_ID,
        selector: (value) => value ?? '1576B20B2BA20523',
    },
    personalDetails: {
        key: ONYXKEYS.PERSONAL_DETAILS_LIST,
    },
    reportClosedAction: {
        key: ({report}) => `${ONYXKEYS.COLLECTION.REPORT_ACTIONS}${report.reportID}`,
        canEvict: false,
        selector: ReportActionsUtils.getLastClosedReportAction,
    },
})(ArchivedReportFooter);
