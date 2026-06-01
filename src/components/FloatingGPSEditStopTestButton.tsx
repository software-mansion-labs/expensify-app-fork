import React, {useRef} from 'react';
// eslint-disable-next-line no-restricted-imports
import type {Role, Text, View as ViewType} from 'react-native';
import {View} from 'react-native';
import useCurrentUserPersonalDetails from '@hooks/useCurrentUserPersonalDetails';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useOnyx from '@hooks/useOnyx';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import {sanitizeWaypointsForAPI} from '@libs/actions/Transaction';
import * as API from '@libs/API';
import type CreateDistanceRequestParams from '@libs/API/parameters/CreateDistanceRequestParams';
import {WRITE_COMMANDS} from '@libs/API/types';
import {canUseTouchScreen} from '@libs/DeviceCapabilities';
import DistanceRequestUtils from '@libs/DistanceRequestUtils';
import {calculateTrimmedEndPoint, getGPSWaypoints} from '@libs/GPSDraftDetailsUtils';
import {roundToTwoDecimalPlaces} from '@libs/NumberUtils';
import {generateReportID, getPolicyExpenseChat} from '@libs/ReportUtils';
import variables from '@styles/variables';
import ONYXKEYS from '@src/ONYXKEYS';
import type {GpsDraftDetails} from '@src/types/onyx';
import type {GPSPoint, TrimmedGPSPoint} from '@src/types/onyx/GpsDraftDetails';
import type {Unit} from '@src/types/onyx/Policy';
import geodesicDistance from '@src/utils/geodesicDistance';
import {convertCoordinatesToGpsPoints, TEST_GPS_COORDINATES, TEST_GPS_WAYPOINT_ADDRESSES} from './FloatingDistanceTestGPSData';
import Icon from './Icon';
import {PressableWithoutFeedback} from './Pressable';

type FloatingGPSEditStopTestButtonProps = {
    accessibilityLabel: string;
    role: Role;
};

function calculateTotalDistanceMeters(gpsPoints: GPSPoint[][]): number {
    let totalDistance = 0;

    for (const segment of gpsPoints) {
        for (let pointIndex = 1; pointIndex < segment.length; pointIndex++) {
            const previousPoint = segment.at(pointIndex - 1);
            const currentPoint = segment.at(pointIndex);

            if (!previousPoint || !currentPoint) {
                continue;
            }

            totalDistance += geodesicDistance(previousPoint, currentPoint);
        }
    }

    return totalDistance;
}

function buildTestGpsPoints(): GPSPoint[][] {
    const gpsPoints = convertCoordinatesToGpsPoints(TEST_GPS_COORDINATES);
    const segment0 = gpsPoints.at(0);
    const segment1 = gpsPoints.at(1);
    const segment0FirstPoint = segment0?.at(0);
    const segment0LastPoint = segment0?.at(-1);
    const segment1FirstPoint = segment1?.at(0);
    const segment1LastPoint = segment1?.at(-1);

    if (segment0FirstPoint) {
        segment0FirstPoint.address = {value: TEST_GPS_WAYPOINT_ADDRESSES.segment0Start, type: 'address'};
    }

    if (segment0LastPoint) {
        segment0LastPoint.address = {value: TEST_GPS_WAYPOINT_ADDRESSES.segment0End, type: 'address'};
    }

    if (segment1FirstPoint) {
        segment1FirstPoint.address = {value: TEST_GPS_WAYPOINT_ADDRESSES.segment1Start, type: 'address'};
    }

    if (segment1LastPoint) {
        segment1LastPoint.address = {value: TEST_GPS_WAYPOINT_ADDRESSES.segment1End, type: 'address'};
    }

    return gpsPoints;
}

function buildTestGpsDraftDetails(unit: Unit): {gpsDraftDetails: GpsDraftDetails; trimmedEndPoint: TrimmedGPSPoint} {
    const gpsPoints = buildTestGpsPoints();
    const distanceInMeters = calculateTotalDistanceMeters(gpsPoints);
    const lastSegment = gpsPoints.at(-1);

    if (!lastSegment) {
        throw new Error('Test GPS route must contain at least one segment');
    }

    const lastSegmentDistanceMeters = calculateTotalDistanceMeters([lastSegment]);
    const distanceBeforeLastSegment = distanceInMeters - lastSegmentDistanceMeters;
    const modifiedDistanceMeters = distanceBeforeLastSegment + lastSegmentDistanceMeters * 0.5;
    const trimmedEndPoint = calculateTrimmedEndPoint(gpsPoints, modifiedDistanceMeters);

    if (!trimmedEndPoint) {
        throw new Error('Failed to calculate trimmed end point for test GPS route');
    }

    const trimmedEndPointWithAddress: TrimmedGPSPoint = {
        ...trimmedEndPoint,
        address: {value: `${trimmedEndPoint.lat.toFixed(4)}, ${trimmedEndPoint.long.toFixed(4)}`, type: 'coordinates'},
    };

    const gpsDraftDetails: GpsDraftDetails = {
        gpsPoints,
        distanceInMeters,
        isTracking: false,
        reportID: '',
        unit,
        modifiedDistance: modifiedDistanceMeters,
        trimmedEndPoint: trimmedEndPointWithAddress,
    };

    return {gpsDraftDetails, trimmedEndPoint: trimmedEndPointWithAddress};
}

function insertStopWaypointIntoGpsPoints(gpsPoints: GPSPoint[][], trimmedEndPoint: TrimmedGPSPoint): GPSPoint[][] {
    const segment = gpsPoints.at(trimmedEndPoint.segmentIndex);

    if (!segment) {
        return gpsPoints;
    }

    const stopPoint: GPSPoint = {
        lat: trimmedEndPoint.lat,
        long: trimmedEndPoint.long,
    };

    const updatedSegment = [...segment.slice(0, trimmedEndPoint.precedingPointIndex + 1), stopPoint, ...segment.slice(trimmedEndPoint.precedingPointIndex + 1)];
    const updatedGpsPoints = [...gpsPoints];
    updatedGpsPoints.splice(trimmedEndPoint.segmentIndex, 1, updatedSegment);

    return updatedGpsPoints;
}

function getStringifiedGPSCoordinatesWithStopWaypoint(gpsPoints: GPSPoint[][], trimmedEndPoint: TrimmedGPSPoint): string {
    const gpsPointsWithStopWaypoint = insertStopWaypointIntoGpsPoints(gpsPoints, trimmedEndPoint);

    return JSON.stringify(gpsPointsWithStopWaypoint.map((points) => points.map(({lat, long}) => ({lng: long, lat}))));
}

function FloatingGPSEditStopTestButton({accessibilityLabel, role}: FloatingGPSEditStopTestButtonProps) {
    const {link, textLight} = useTheme();
    const styles = useThemeStyles();
    const borderRadius = styles.floatingActionButton.borderRadius;
    const fabPressable = useRef<HTMLDivElement | ViewType | Text | null>(null);
    const expensifyIcons = useMemoizedLazyExpensifyIcons(['Pencil'] as const);
    const currentUserPersonalDetails = useCurrentUserPersonalDetails();
    const [activePolicyID] = useOnyx(ONYXKEYS.NVP_ACTIVE_POLICY_ID);
    const [activePolicy] = useOnyx(`${ONYXKEYS.COLLECTION.POLICY}${activePolicyID}`);
    const [allReports] = useOnyx(ONYXKEYS.COLLECTION.REPORT);
    const currentUserPolicyExpenseChatReportID = getPolicyExpenseChat(currentUserPersonalDetails.accountID, activePolicy?.id, allReports)?.reportID;

    const handlePress = () => {
        fabPressable.current?.blur();

        const unit: Unit = DistanceRequestUtils.getDefaultMileageRate(activePolicy)?.unit ?? 'mi';
        const {gpsDraftDetails, trimmedEndPoint} = buildTestGpsDraftDetails(unit);
        const waypoints = sanitizeWaypointsForAPI(getGPSWaypoints(gpsDraftDetails, trimmedEndPoint));
        const gpsCoordinates = getStringifiedGPSCoordinatesWithStopWaypoint(gpsDraftDetails.gpsPoints, trimmedEndPoint);
        const trimmedDistance = roundToTwoDecimalPlaces(DistanceRequestUtils.convertDistanceUnit(gpsDraftDetails.modifiedDistance ?? 0, unit));

        const parameters: CreateDistanceRequestParams = {
            transactionID: `gps-edit-stop-test-${Date.now()}`,
            chatReportID: currentUserPolicyExpenseChatReportID ?? '',
            reportActionID: generateReportID(),
            waypoints: JSON.stringify(waypoints),
            customUnitRateID: '',
            comment: 'Test GPS edit stop distance request',
            created: new Date().toISOString(),
            gpsCoordinates,
            distance: trimmedDistance,
        };

        API.write(WRITE_COMMANDS.CREATE_DISTANCE_REQUEST, parameters);
    };

    return (
        <PressableWithoutFeedback
            ref={(el) => {
                fabPressable.current = el ?? null;
            }}
            style={[styles.navigationTabBarFABItem, canUseTouchScreen() && styles.userSelectNone]}
            accessibilityLabel={accessibilityLabel}
            onPress={handlePress}
            role={role}
            shouldUseHapticsOnLongPress
            testID="floating-gps-edit-stop-test-button"
        >
            {({hovered}) => (
                <View
                    style={[styles.floatingActionButton, {borderRadius}, styles.floatingActionButtonSmall, hovered && {backgroundColor: link}]}
                    testID="floating-gps-edit-stop-test-button-container"
                >
                    <Icon
                        fill={textLight}
                        src={expensifyIcons.Pencil}
                        width={variables.iconSizeSmall}
                        height={variables.iconSizeSmall}
                    />
                </View>
            )}
        </PressableWithoutFeedback>
    );
}

FloatingGPSEditStopTestButton.displayName = 'FloatingGPSEditStopTestButton';

export default FloatingGPSEditStopTestButton;
