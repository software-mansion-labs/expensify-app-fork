import type {ReservationData} from '@libs/TripReservationUtils';

type UpcomingReservation = ReservationData & {
    reportID: string;
};

// TODO: implement — see plan Phase 2
function useUpcomingTravelReservations(): UpcomingReservation[] {
    return [];
}

export default useUpcomingTravelReservations;
export type {UpcomingReservation};
