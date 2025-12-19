import React, {useEffect, useRef, useState} from 'react';
import {View} from 'react-native';
import type {OnyxEntry} from 'react-native-onyx';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import {useMemoizedLazyIllustrations} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import variables from '@styles/variables';
import type * as OnyxTypes from '@src/types/onyx';
import BlockingView from './BlockingView';
import ForceFullScreenView from './ForceFullScreenView';

/**
 * Returns true if the report was deleted. Once true, stays true until reportIDFromRoute changes.
 * Works only when the component with the report was already rendered before deletion -
 * it tracks if reportID was ever equal to reportIDFromRoute, then detects when it becomes undefined.
 */
function useReportWasDeleted(reportIDFromRoute: string | undefined, report: OnyxEntry<OnyxTypes.Report> | undefined, isOptimisticDelete: boolean, userLeavingStatus: boolean): boolean {
    const wasEverAccessibleRef = useRef(false);
    const [wasDeleted, setWasDeleted] = useState(false);
    const prevReportIDFromRouteRef = useRef(reportIDFromRoute);

    const currentReportID = report?.reportID;

    // Reset when navigating to a different report
    useEffect(() => {
        if (prevReportIDFromRouteRef.current === reportIDFromRoute) {
            return;
        }

        wasEverAccessibleRef.current = false;
        setWasDeleted(false);
        prevReportIDFromRouteRef.current = reportIDFromRoute;
    }, [reportIDFromRoute]);

    useEffect(() => {
        if (wasEverAccessibleRef.current) {
            return;
        }

        if (currentReportID && currentReportID === reportIDFromRoute) {
            wasEverAccessibleRef.current = true;
        }
    }, [currentReportID, reportIDFromRoute]);

    useEffect(() => {
        if (wasDeleted || isOptimisticDelete || userLeavingStatus) {
            return;
        }

        if (wasEverAccessibleRef.current && !currentReportID) {
            setWasDeleted(true);
        }
    }, [wasDeleted, isOptimisticDelete, userLeavingStatus, currentReportID]);

    return wasDeleted;
}



type DeletedReportViewProps = {
    /** Child elements */
    children?: React.ReactNode;

    /** The report ID from the navigation route */
    reportIDFromRoute: string | undefined;

    /** The current report object from Onyx */
    report: OnyxEntry<OnyxTypes.Report> | undefined;

    /** Whether the report is being optimistically deleted */
    isOptimisticDelete: boolean;

    /** Whether the user is leaving the room */
    userLeavingStatus: boolean;

    /** Whether we should show the back button on the header */
    shouldShowBackButton?: boolean;

    /** Method to trigger when pressing the back button of the header */
    onBackButtonPress?: () => void;

    /** Whether we should display the button that opens new SearchRouter */
    shouldDisplaySearchRouter?: boolean;
};

function DeletedReportView({
    children = null,
    reportIDFromRoute,
    report,
    isOptimisticDelete,
    userLeavingStatus,
    shouldShowBackButton = true,
    onBackButtonPress = () => Navigation.goBack(),
    shouldDisplaySearchRouter,
}: DeletedReportViewProps) {
    const styles = useThemeStyles();
    const {isMediumScreenWidth, isLargeScreenWidth} = useResponsiveLayout();
    const {translate} = useLocalize();
    const illustrations = useMemoizedLazyIllustrations(['TrashCan']);

    const isReportDeleted = useReportWasDeleted(reportIDFromRoute, report, isOptimisticDelete, userLeavingStatus);

    if (isReportDeleted) {
        return (
            <ForceFullScreenView shouldForceFullScreen={false}>
                <HeaderWithBackButton
                    onBackButtonPress={onBackButtonPress}
                    shouldShowBackButton={shouldShowBackButton}
                    shouldDisplaySearchRouter={shouldDisplaySearchRouter && (isMediumScreenWidth || isLargeScreenWidth)}
                />
                <View style={[styles.flex1, styles.blockingViewContainer]}>
                    <BlockingView
                        icon={illustrations.TrashCan}
                        iconWidth={variables.modalTopIconWidth}
                        iconHeight={variables.modalTopIconHeight}
                        title={translate('report.deleted.title')}
                        testID="DeletedReportView"
                    />
                </View>
            </ForceFullScreenView>
        );
    }

    return children;
}

DeletedReportView.displayName = 'DeletedReportView';

export default DeletedReportView;
