import Text from '@components/Text';

import {useCurrentReportIDState} from '@hooks/useCurrentReportID';
import useOnyx from '@hooks/useOnyx';
import useStyleUtils from '@hooks/useStyleUtils';
import useThemeStyles from '@hooks/useThemeStyles';

import getNonEmptyStringOnyxID from '@libs/getNonEmptyStringOnyxID';
import {getReportMentionDetails} from '@libs/MentionUtils';
import isSearchTopmostFullScreenRoute from '@libs/Navigation/helpers/isSearchTopmostFullScreenRoute';

import Navigation from '@navigation/Navigation';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Route} from '@src/ROUTES';
import ROUTES from '@src/ROUTES';
import {isEmptyObject} from '@src/types/utils/EmptyObject';

import type {TextStyle} from 'react-native';
import type {CustomRendererProps, TPhrasing, TText} from 'react-native-render-html';

import React, {useContext, useMemo} from 'react';
import {StyleSheet} from 'react-native';
import OnyxUtils from 'react-native-onyx/dist/OnyxUtils';

import MentionReportContext from './MentionReportContext';

type MentionReportRendererProps = CustomRendererProps<TText | TPhrasing>;

function MentionReportRenderer({style, tnode, TDefaultRenderer, ...defaultRendererProps}: MentionReportRendererProps) {
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const htmlAttributeReportID = tnode.attributes.reportid;
    const {currentReportID: currentReportIDContext, exactlyMatch, policyID} = useContext(MentionReportContext);
    // Lazy-Onyx POC: subscribe to the ONE report the mention points at instead of the whole REPORT
    // collection (which a collection-root subscription would fully hydrate). Mentions carrying a
    // reportid attribute only ever do a keyed lookup, so a one-entry collection is equivalent.
    const mentionReportKey = `${ONYXKEYS.COLLECTION.REPORT}${getNonEmptyStringOnyxID(htmlAttributeReportID)}` as const;
    const [mentionReport] = useOnyx(mentionReportKey);
    // Legacy name-only mentions (no reportid attribute) scan the collection for a room name match.
    // Serve that scan from the warm cache without subscribing: it is best-effort by design, and
    // post-ready the derived-key catch-all has hydrated REPORT anyway, so the cache is complete
    // whenever a user can actually see such a mention.
    const reports = htmlAttributeReportID ? {[mentionReportKey]: mentionReport} : OnyxUtils.getCachedCollection(ONYXKEYS.COLLECTION.REPORT);

    const {currentReportID} = useCurrentReportIDState();
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const currentReportIDValue = currentReportIDContext || currentReportID;
    const [currentReport] = useOnyx(`${ONYXKEYS.COLLECTION.REPORT}${currentReportIDValue}`);

    // When we invite someone to a room they don't have the policy object, but we still want them to be able to see and click on report mentions, so we only check if the policyID in the report is from a workspace
    const isGroupPolicyReport = useMemo(
        () => (!!currentReport && !isEmptyObject(currentReport) && !!currentReport.policyID && currentReport.policyID !== CONST.POLICY.ID_FAKE) || !!policyID,
        [currentReport, policyID],
    );

    const mentionDetails = getReportMentionDetails(htmlAttributeReportID, currentReport, reports, tnode, policyID);
    if (!mentionDetails) {
        return null;
    }
    const {reportID, mentionDisplayText} = mentionDetails;

    let navigationRoute: Route | undefined = reportID ? ROUTES.REPORT_WITH_ID.getRoute(reportID) : undefined;
    const backTo = Navigation.getActiveRoute();
    if (isSearchTopmostFullScreenRoute()) {
        navigationRoute = reportID ? ROUTES.SEARCH_REPORT.getRoute({reportID, backTo}) : undefined;
    }
    const isCurrentRoomMention = reportID === currentReportIDValue;

    const flattenStyle = StyleSheet.flatten(style as TextStyle);
    const {color, ...styleWithoutColor} = flattenStyle;

    return (
        <Text
            {...defaultRendererProps}
            style={
                isGroupPolicyReport && (!exactlyMatch || navigationRoute)
                    ? [styles.link, styleWithoutColor, StyleUtils.getMentionStyle(isCurrentRoomMention), {color: StyleUtils.getMentionTextColor(isCurrentRoomMention)}]
                    : [flattenStyle]
            }
            suppressHighlighting
            onPress={
                navigationRoute && isGroupPolicyReport
                    ? (event) => {
                          event.preventDefault();
                          Navigation.navigate(navigationRoute);
                      }
                    : undefined
            }
            role={isGroupPolicyReport ? CONST.ROLE.LINK : undefined}
            accessibilityLabel={isGroupPolicyReport ? `/${navigationRoute}` : undefined}
        >
            #{mentionDisplayText}
        </Text>
    );
}

export default MentionReportRenderer;
