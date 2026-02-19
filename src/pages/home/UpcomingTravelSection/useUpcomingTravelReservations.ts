import {useMemo} from 'react';
import useOnyx from '@hooks/useOnyx';
import {isTripRoom} from '@libs/ReportUtils';
import type {ReservationData} from '@libs/TripReservationUtils';
import {getReservationsFromTripReport} from '@libs/TripReservationUtils';
import ONYXKEYS from '@src/ONYXKEYS';

const UPCOMING_WINDOW_DAYS = 7;

type UpcomingReservation = ReservationData & {
    reportID: string;
};

function useUpcomingTravelReservations(): UpcomingReservation[] {
    const [allReports] = useOnyx(ONYXKEYS.COLLECTION.REPORT, {canBeMissing: true});

    return useMemo(() => {
        const now = new Date();
        const windowEnd = new Date(now);
        windowEnd.setDate(windowEnd.getDate() + UPCOMING_WINDOW_DAYS);

        const reports = Object.values(allReports ?? {});
        const upcoming: UpcomingReservation[] = [];

        for (const report of reports) {
            if (!report || !isTripRoom(report)) {
                continue;
            }
            const reservations = getReservationsFromTripReport(report);
            for (const resData of reservations) {
                const startDate = new Date(resData.reservation.start.date);
                if (Number.isNaN(startDate.getTime())) {
                    continue;
                }
                if (startDate >= now && startDate <= windowEnd) {
                    upcoming.push({...resData, reportID: report.reportID});
                }
            }
        }

        return upcoming.sort((a, b) => new Date(a.reservation.start.date).getTime() - new Date(b.reservation.start.date).getTime());
    }, [allReports]);
}

export default useUpcomingTravelReservations;
export type {UpcomingReservation};
