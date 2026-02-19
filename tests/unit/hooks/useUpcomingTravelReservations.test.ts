/* cspell:disable */
import {renderHook} from '@testing-library/react-native';
import Onyx from 'react-native-onyx';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Report} from '@src/types/onyx';
import type {Pnr, TripData} from '@src/types/onyx/TripData';
import useUpcomingTravelReservations from '@pages/home/UpcomingTravelSection/useUpcomingTravelReservations';
import waitForBatchedUpdates from '../../utils/waitForBatchedUpdates';

function daysFromNow(days: number, hours = 12): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(hours, 0, 0, 0);
    return date.toISOString();
}

function hoursFromNow(hours: number): string {
    const date = new Date();
    date.setHours(date.getHours() + hours);
    return date.toISOString();
}

function makeAirPnr(pnrId: string, departureISO: string, arrivalISO: string, origin = 'ORD', destination = 'SFO'): Pnr {
    return {
        pnrId,
        data: {
            airPnr: {
                legs: [
                    {
                        flights: [
                            {
                                origin,
                                destination,
                                departureDateTime: {iso8601: departureISO},
                                arrivalDateTime: {iso8601: arrivalISO},
                                marketing: {airlineCode: 'UA', num: '456'},
                                vendorConfirmationNumber: 'CONF123',
                                cabin: 'Economy',
                                duration: {iso8601: 'PT3H'},
                                amenities: [],
                                arrivalGate: {gate: 'A12', terminal: '1'},
                                bookingCode: '',
                                co2EmissionDetail: {averageEmissionValue: 0, emissionValue: 0, flightDistanceKm: 0, isApproximate: false},
                                departureGate: {gate: 'B5', terminal: '3'},
                                distance: {length: 0, unit: ''},
                                equipment: {code: '', name: '', type: ''},
                                flightId: '',
                                flightIndex: 0,
                                flightStatus: '',
                                flightWaiverCodes: [],
                                hiddenStops: [],
                                operating: {airlineCode: '', num: ''},
                                operatingAirlineName: '',
                                otherStatuses: [],
                                restrictions: [],
                                sourceStatus: '',
                            },
                        ],
                        brandName: '',
                        fareOffers: [],
                        legId: '',
                        legIndex: 0,
                        legStatus: '',
                        preferences: [],
                        preferredTypes: [],
                        rateType: '',
                        sortingPriority: 0,
                        travelerRestrictions: [],
                        validatingAirlineCode: '',
                    },
                ],
                airPnrRemarks: [],
                travelerInfos: [
                    {
                        tickets: [
                            {
                                flightCoupons: [{legIdx: 0, flightIdx: 0, status: 'CONFIRMED'}],
                                amount: {
                                    base: {amount: 0, convertedAmount: 0, convertedCurrency: '', currencyCode: '', otherCoinage: []},
                                    tax: {amount: 0, convertedAmount: 0, convertedCurrency: '', currencyCode: '', otherCoinage: []},
                                },
                                ancillaries: [],
                                commission: {amount: {amount: 0, convertedAmount: 0, convertedCurrency: '', currencyCode: '', otherCoinage: []}, percent: 0},
                                conjunctionTicketSuffix: [],
                                exchangePolicy: {isCat16: false, isConditional: false, isExchangeable: false},
                                fareCalculation: '',
                                iataNumber: '',
                                issuedDateTime: {iso8601: ''},
                                paymentDetails: [],
                                pcc: '',
                                publishedFare: {
                                    base: {amount: 0, convertedAmount: 0, convertedCurrency: '', currencyCode: '', otherCoinage: []},
                                    tax: {amount: 0, convertedAmount: 0, convertedCurrency: '', currencyCode: '', otherCoinage: []},
                                },
                                refundPolicy: {isCat16: false, isConditional: false, isRefundable: false, isRefundableByObt: false},
                                status: '',
                                taxBreakdown: {tax: []},
                                ticketIncompleteReasons: [],
                                ticketNumber: '',
                                ticketSettlement: '',
                                ticketType: '',
                                validatingAirlineCode: '',
                                vendorCancellationId: '',
                            },
                        ],
                        booking: {
                            seats: [{legIdx: 0, flightIdx: 0, amount: 0, number: '14C'}],
                            itinerary: {
                                fareComponents: [],
                                flightFareBreakup: [],
                                otherAncillaryFares: [],
                                totalFare: {
                                    base: {amount: 0, convertedAmount: 0, convertedCurrency: '', currencyCode: '', otherCoinage: []},
                                    tax: {amount: 0, convertedAmount: 0, convertedCurrency: '', currencyCode: '', otherCoinage: []},
                                },
                                totalFlightsFare: {
                                    base: {amount: 0, convertedAmount: 0, convertedCurrency: '', currencyCode: '', otherCoinage: []},
                                    tax: {amount: 0, convertedAmount: 0, convertedCurrency: '', currencyCode: '', otherCoinage: []},
                                },
                            },
                            luggageDetails: [],
                            otherAncillaries: [],
                            otherCharges: [],
                        },
                        userId: {id: 'user123'},
                        airVendorCancellationInfo: {airVendorCancellationObjects: []},
                        appliedCredits: [],
                        boardingPass: [],
                        paxType: '',
                        specialServiceRequestInfos: [],
                        travelerIdx: 0,
                    },
                ],
                automatedCancellationInfo: {supportedCancellations: []},
                automatedExchangeInfo: {supportedExchanges: []},
                bookingMetadata: {fareStatistics: {statisticsItems: []}},
                otherServiceInfos: [],
                holdDeadline: {holdDeadline: {}},
                airPriceOptimizationMetadata: {
                    oldTickets: [],
                    newTickets: [],
                    oldPnrId: '',
                    newPnrId: '',
                    oldPrice: {otherCoinage: []},
                    newPrice: {otherCoinage: []},
                    priceDrop: {otherCoinage: []},
                    penaltyPrice: {otherCoinage: []},
                },
                disruptedFlightDetails: [],
            },
            pnrTravelers: [
                {
                    userId: {id: 'user123'},
                    personalInfo: {name: {family1: 'Doe', given: 'John', middle: '', family2: '', preferred: ''}, email: 'john@example.com', addresses: [], phoneNumbers: []},
                    travelerInfo: {},
                    loyalties: [],
                    persona: '',
                    businessInfo: {companySpecifiedAttributes: []},
                    tier: '',
                },
            ],
            additionalMetadata: {
                airportInfo: [
                    {
                        airportCode: origin,
                        airportName: `${origin} Airport`,
                        cityName: origin === 'ORD' ? 'Chicago' : origin,
                        stateCode: 'IL',
                        countryName: 'USA',
                        countryCode: '',
                        zoneName: '',
                    },
                    {
                        airportCode: destination,
                        airportName: `${destination} Airport`,
                        cityName: destination === 'SFO' ? 'San Francisco' : destination,
                        stateCode: 'CA',
                        countryName: 'USA',
                        countryCode: '',
                        zoneName: '',
                    },
                ],
                airlineInfo: [{airlineCode: 'UA', airlineName: 'United Airlines'}],
            },
            version: 0,
            travelers: [],
            transactions: [],
            customFields: [],
            tripId: '',
            suspendReason: '',
            totalFareAmount: {base: {amount: 50, convertedAmount: 0, convertedCurrency: 'USD', currencyCode: 'USD'}, tax: {amount: 5}},
        },
    };
}

function makeHotelPnr(pnrId: string, checkInISO: string, checkOutISO: string): Pnr {
    return {
        pnrId,
        data: {
            hotelPnr: {
                checkInDateTime: {iso8601: checkInISO},
                checkOutDateTime: {iso8601: checkOutISO},
                hotelInfo: {
                    name: 'Grand Hotel',
                    address: {
                        addressLines: ['456 Elm St'],
                        locality: 'New York',
                        administrativeArea: '',
                        administrativeAreaName: '',
                        continentCode: '',
                        description: '',
                        isDefault: false,
                        languageCode: '',
                        locationCode: '',
                        organization: '',
                        postalCode: '',
                        recipients: [],
                        regionCode: '',
                        regionName: '',
                        revision: 0,
                        sortingCode: '',
                        sublocality: '',
                        timezone: '',
                    },
                    chainName: 'Premium Hotels',
                    chainCode: 'PH',
                    additionalAmenities: [],
                    amenities: [],
                    brandName: '',
                    coordinates: {latitude: 0, longitude: 0},
                    descriptions: [],
                    email: '',
                    fax: [],
                    hotelId: '',
                    imageSets: [],
                    masterChainCode: '',
                    phone: {
                        countryCode: 0,
                        countryCodeSource: '',
                        extension: '',
                        isoCountryCode: '',
                        italianLeadingZero: false,
                        nationalNumber: 0,
                        numberOfLeadingZeros: 0,
                        preferredDomesticCarrierCode: '',
                        rawInput: '',
                        type: '',
                    },
                    starRating: 0,
                    thirdPartyHotelCodes: [],
                },
                numberOfRooms: 1,
                room: {
                    roomName: 'Deluxe Suite',
                    cancellationPolicy: {policy: 'Non-refundable', deadline: {iso8601: checkInISO}, deadlineUtc: {iso8601: ''}},
                    additionalAmenities: [],
                    additionalDetails: [],
                    amenities: [],
                    bedCount: 0,
                    bedType: '',
                    guaranteeType: '',
                    imageSets: [],
                    meals: {mealPlan: '', mealsIncluded: []},
                    rateInfo: {
                        isFopModifiable: false,
                        isModifiable: false,
                        nightlyRate: {amount: 0, convertedAmount: 0, convertedCurrency: '', currencyCode: '', otherCoinage: []},
                        nightlyRates: [],
                        postpaidRate: {
                            base: {amount: 0, convertedAmount: 0, convertedCurrency: '', currencyCode: '', otherCoinage: []},
                            extras: [],
                            includesCommission: false,
                            tax: {amount: 0, convertedAmount: 0, convertedCurrency: '', currencyCode: '', otherCoinage: []},
                        },
                        prepaidRate: {
                            base: {amount: 0, convertedAmount: 0, convertedCurrency: '', currencyCode: '', otherCoinage: []},
                            extras: [],
                            includesCommission: false,
                            tax: {amount: 0, convertedAmount: 0, convertedCurrency: '', currencyCode: '', otherCoinage: []},
                        },
                        rateCode: '',
                        rateType: '',
                        totalRate: {
                            base: {amount: 0, convertedAmount: 0, convertedCurrency: '', currencyCode: '', otherCoinage: []},
                            commission: {amount: {amount: 0, convertedAmount: 0, convertedCurrency: '', currencyCode: '', otherCoinage: []}, percent: 0},
                            extras: [],
                            includesCommission: false,
                            tax: {amount: 0, convertedAmount: 0, convertedCurrency: '', currencyCode: '', otherCoinage: []},
                            taxBreakdown: {tax: []},
                            transactionDate: {iso8601: ''},
                        },
                    },
                    roomInfo: {roomType: '', roomTypeCode: '', typeClassDescription: ''},
                },
                vendorConfirmationNumber: 'HOTELCONF123',
                hotelSpecialRequests: {accessibleFeatures: [], additionalNote: '', flightNumber: '', roomFeatures: [], roomLocations: []},
                occupancy: [],
                payment: {description: '', paymentType: ''},
                pnrStatus: '',
                preferences: [],
                preferredType: [],
                sortingPriority: 0,
                sourceStatus: '',
                travelerInfos: [],
                vendorCancellationId: '',
                vendorReferenceId: '',
            },
            pnrTravelers: [
                {
                    personalInfo: {name: {family1: 'Johnson', given: 'Emily', middle: '', family2: '', preferred: ''}, email: 'emily@example.com', addresses: [], phoneNumbers: []},
                    userId: {id: ''},
                    travelerInfo: {},
                    loyalties: [],
                    persona: '',
                    businessInfo: {companySpecifiedAttributes: []},
                    tier: '',
                },
            ],
            version: 0,
            travelers: [],
            transactions: [],
            additionalMetadata: {airportInfo: [], airlineInfo: []},
            customFields: [],
            tripId: '',
            suspendReason: '',
            totalFareAmount: {base: {amount: 200, convertedAmount: 0, convertedCurrency: '', currencyCode: 'USD'}, tax: {amount: 20}},
        },
    };
}

function makeRailPnr(pnrId: string, departISO: string, arriveISO: string): Pnr {
    return {
        pnrId,
        data: {
            railPnr: {
                legInfos: [
                    {
                        originInfo: {
                            name: 'Station X',
                            cityName: 'City X',
                            code: 'STX',
                            cityCode: '',
                            continentCode: '',
                            countryCode: '',
                            latLong: {latitude: 0, longitude: 0},
                            localCode: '',
                            sourceRefInfos: [],
                            stateCode: '',
                            stationType: '',
                            timeZone: '',
                        },
                        destinationInfo: {
                            name: 'Station Y',
                            cityName: 'City Y',
                            code: 'STY',
                            cityCode: '',
                            continentCode: '',
                            countryCode: '',
                            latLong: {latitude: 0, longitude: 0},
                            localCode: '',
                            sourceRefInfos: [],
                            stateCode: '',
                            stationType: '',
                            timeZone: '',
                        },
                        departAt: {iso8601: departISO},
                        arriveAt: {iso8601: arriveISO},
                        duration: {iso8601: 'PT4H'},
                        allocatedSpaces: [{seatNumber: '12A', coachNumber: 'C1'}],
                        vendorName: 'Amtrak',
                        vehicle: {carrierName: 'Amtrak', timetableId: '12345', transportName: 'Train 123', type: 'Train'},
                        ticketNumber: 'RAIL12345',
                        amenities: [],
                        arriveAtLocal: {iso8601: ''},
                        carrierConfirmationNumber: '',
                        co2EmissionGramsPerPassenger: 0,
                        departAtLocal: {iso8601: ''},
                        destination: '',
                        distance: {length: 0, unit: ''},
                        fareType: '',
                        legId: '',
                        origin: '',
                        railFareType: {description: '', fareDetails: [], fareSummary: ''},
                        seatPreferenceSelection: {carriageType: '', deckType: '', direction: '', facilities: [], positionType: '', seatLocationType: '', seatType: ''},
                        travelClass: '',
                        travelerRailInfo: [],
                    },
                ],
                tickets: [{passengerRefs: [0], legs: [0]}],
                passengerInfos: [{userOrgId: {userId: {id: 'user456'}, organizationId: {id: ''}}, passengerType: ''}],
                inwardJourney: {journeyStatus: '', legs: [], co2EmissionDetails: {}, sortingPriority: 0, fareComposition: '', userFacingStatus: ''},
                outwardJourney: {journeyStatus: '', legs: [], co2EmissionDetails: {}, sortingPriority: 0, fareComposition: '', userFacingStatus: ''},
                rate: {
                    base: {otherCoinage: []},
                    extras: [],
                    refund: {otherCoinage: []},
                    tax: {otherCoinage: []},
                    commission: {},
                    includesCommission: false,
                    taxBreakdown: {tax: []},
                    transactionDate: {},
                    refundInfo: {},
                    paymentMode: '',
                },
                rateMetadata: {negotiatedRateType: '', publishedRate: {}, tmcNegotiatedRate: {}, corporateNegotiatedRate: {}},
                paymentMode: '',
                sections: [],
                ticketDetails: [],
                type: '',
                vendorConfirmationNumber: '',
                itineraryId: '',
                ancillaries: [],
                termsAndConditions: {conditions: []},
                exchangeInfo: {exchangeType: '', relatedSectionInfo: {newSectionIndexes: [], oldSectionIndexes: []}},
                previousItinerary: {
                    type: '',
                    outwardJourney: {legs: []},
                    inwardJourney: {legs: []},
                    legInfos: [],
                    sections: [],
                    deliveryOption: '',
                    sourceReference: '',
                    rate: {extras: [], commission: {}, taxBreakdown: {}, refundInfo: {}},
                },
            },
            pnrTravelers: [
                {
                    userId: {id: 'user456'},
                    personalInfo: {name: {family1: 'Smith', given: 'Alice', middle: '', family2: '', preferred: ''}, email: 'alice@example.com', addresses: [], phoneNumbers: []},
                    travelerInfo: {},
                    loyalties: [],
                    persona: '',
                    businessInfo: {companySpecifiedAttributes: []},
                    tier: '',
                },
            ],
            version: 0,
            travelers: [],
            transactions: [],
            additionalMetadata: {airportInfo: [], airlineInfo: []},
            customFields: [],
            tripId: '',
            suspendReason: '',
            totalFareAmount: {base: {amount: 100, convertedAmount: 0, convertedCurrency: '', currencyCode: 'USD'}, tax: {amount: 10}},
        },
    };
}

function makeTripData(pnrs: Pnr[]): TripData {
    return {
        pnrs,
        tripPaymentInfo: {totalFare: {amount: 1000, currencyCode: 'USD'}},
    };
}

function makeTripRoomReport(reportID: string, pnrs: Pnr[]): Report {
    return {
        reportID,
        type: CONST.REPORT.TYPE.CHAT,
        chatType: CONST.REPORT.CHAT_TYPE.TRIP_ROOM,
        reportName: `Trip ${reportID}`,
        policyID: 'policy1',
        tripData: {
            tripID: `trip-${reportID}`,
            payload: makeTripData(pnrs),
        },
    } as Report;
}

describe('useUpcomingTravelReservations', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        await Onyx.clear();
        await waitForBatchedUpdates();
    });

    afterEach(async () => {
        await Onyx.clear();
    });

    it('should return empty array when no reports exist', () => {
        const {result} = renderHook(() => useUpcomingTravelReservations());

        expect(result.current).toEqual([]);
    });

    it('should return empty array when no trip rooms exist', async () => {
        const normalReport: Report = {
            reportID: '1',
            type: CONST.REPORT.TYPE.CHAT,
            chatType: CONST.REPORT.CHAT_TYPE.POLICY_ROOM,
            reportName: 'General',
            policyID: 'policy1',
        } as Report;

        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}1`, normalReport);
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useUpcomingTravelReservations());

        expect(result.current).toEqual([]);
    });

    it('should return empty array when all reservations are in the past', async () => {
        const pastFlight = makeAirPnr('PNR_PAST', daysFromNow(-3), daysFromNow(-3, 15));
        const tripRoom = makeTripRoomReport('100', [pastFlight]);

        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}100`, tripRoom);
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useUpcomingTravelReservations());

        expect(result.current).toEqual([]);
    });

    it('should return empty array when all reservations are more than 7 days away', async () => {
        const farFlight = makeAirPnr('PNR_FAR', daysFromNow(10), daysFromNow(10, 15));
        const tripRoom = makeTripRoomReport('101', [farFlight]);

        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}101`, tripRoom);
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useUpcomingTravelReservations());

        expect(result.current).toEqual([]);
    });

    it('should return reservation departing within 7 days', async () => {
        const upcomingFlight = makeAirPnr('PNR_UPCOMING', daysFromNow(3), daysFromNow(3, 15));
        const tripRoom = makeTripRoomReport('102', [upcomingFlight]);

        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}102`, tripRoom);
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useUpcomingTravelReservations());

        expect(result.current).toHaveLength(1);
        expect(result.current.at(0)?.reservation.reservationID).toBe('PNR_UPCOMING');
        expect(result.current.at(0)?.reservation.type).toBe(CONST.RESERVATION_TYPE.FLIGHT);
        expect(result.current.at(0)?.reportID).toBe('102');
    });

    it('should include reservation exactly 7 days from now', async () => {
        const boundaryFlight = makeAirPnr('PNR_7DAYS', daysFromNow(7), daysFromNow(7, 15));
        const tripRoom = makeTripRoomReport('103', [boundaryFlight]);

        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}103`, tripRoom);
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useUpcomingTravelReservations());

        expect(result.current).toHaveLength(1);
        expect(result.current.at(0)?.reservation.reservationID).toBe('PNR_7DAYS');
    });

    it('should include reservation departing today', async () => {
        const todayFlight = makeAirPnr('PNR_TODAY', daysFromNow(0, 18), daysFromNow(0, 21));
        const tripRoom = makeTripRoomReport('104', [todayFlight]);

        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}104`, tripRoom);
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useUpcomingTravelReservations());

        expect(result.current).toHaveLength(1);
        expect(result.current.at(0)?.reservation.reservationID).toBe('PNR_TODAY');
    });

    it('should exclude reservation that departed earlier today', async () => {
        const pastFlight = makeAirPnr('PNR_JUST_PASSED', daysFromNow(-1, 22), daysFromNow(-1, 23));
        const upcomingFlight = makeAirPnr('PNR_LATER_TODAY', daysFromNow(0, 23), daysFromNow(1, 2));
        const tripRoom = makeTripRoomReport('105', [pastFlight, upcomingFlight]);

        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}105`, tripRoom);
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useUpcomingTravelReservations());

        expect(result.current.find((r) => r.reservation.reservationID === 'PNR_JUST_PASSED')).toBeUndefined();
        expect(result.current).toHaveLength(1);
        expect(result.current.at(0)?.reservation.reservationID).toBe('PNR_LATER_TODAY');
    });

    it('should sort reservations by start date ascending', async () => {
        const flight1 = makeAirPnr('PNR_DAY5', daysFromNow(5), daysFromNow(5, 15));
        const flight2 = makeAirPnr('PNR_DAY1', daysFromNow(1), daysFromNow(1, 15));
        const flight3 = makeAirPnr('PNR_DAY3', daysFromNow(3), daysFromNow(3, 15));

        const tripRoom1 = makeTripRoomReport('200', [flight1]);
        const tripRoom2 = makeTripRoomReport('201', [flight2, flight3]);

        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}200`, tripRoom1);
        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}201`, tripRoom2);
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useUpcomingTravelReservations());

        expect(result.current).toHaveLength(3);
        expect(result.current.at(0)?.reservation.reservationID).toBe('PNR_DAY1');
        expect(result.current.at(1)?.reservation.reservationID).toBe('PNR_DAY3');
        expect(result.current.at(2)?.reservation.reservationID).toBe('PNR_DAY5');
    });

    it('should only return reservations within 7-day window from mixed valid/invalid set', async () => {
        const pastFlight = makeAirPnr('PNR_PAST_MIX', daysFromNow(-2), daysFromNow(-2, 15));
        const upcomingFlight = makeAirPnr('PNR_3DAYS_MIX', daysFromNow(3), daysFromNow(3, 15));
        const farFlight = makeAirPnr('PNR_10DAYS_MIX', daysFromNow(10), daysFromNow(10, 15));

        const tripRoom = makeTripRoomReport('300', [pastFlight, upcomingFlight, farFlight]);

        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}300`, tripRoom);
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useUpcomingTravelReservations());

        expect(result.current).toHaveLength(1);
        expect(result.current.at(0)?.reservation.reservationID).toBe('PNR_3DAYS_MIX');
    });

    it('should handle mixed reservation types (flight, hotel, rail)', async () => {
        const flight = makeAirPnr('PNR_FLIGHT_MIX', daysFromNow(2), daysFromNow(2, 15));
        const hotel = makeHotelPnr('PNR_HOTEL_MIX', daysFromNow(4), daysFromNow(6));
        const rail = makeRailPnr('PNR_RAIL_MIX', daysFromNow(1), daysFromNow(1, 16));

        const tripRoom = makeTripRoomReport('400', [flight, hotel, rail]);

        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}400`, tripRoom);
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useUpcomingTravelReservations());

        expect(result.current).toHaveLength(3);

        expect(result.current.at(0)?.reservation.reservationID).toBe('PNR_RAIL_MIX');
        expect(result.current.at(0)?.reservation.type).toBe(CONST.RESERVATION_TYPE.TRAIN);

        expect(result.current.at(1)?.reservation.reservationID).toBe('PNR_FLIGHT_MIX');
        expect(result.current.at(1)?.reservation.type).toBe(CONST.RESERVATION_TYPE.FLIGHT);

        expect(result.current.at(2)?.reservation.reservationID).toBe('PNR_HOTEL_MIX');
        expect(result.current.at(2)?.reservation.type).toBe(CONST.RESERVATION_TYPE.HOTEL);
    });

    it('should aggregate reservations across multiple trip rooms', async () => {
        const flight1 = makeAirPnr('PNR_TRIP1', daysFromNow(4), daysFromNow(4, 15));
        const flight2 = makeAirPnr('PNR_TRIP2', daysFromNow(2), daysFromNow(2, 15));

        const tripRoom1 = makeTripRoomReport('500', [flight1]);
        const tripRoom2 = makeTripRoomReport('501', [flight2]);

        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}500`, tripRoom1);
        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}501`, tripRoom2);
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useUpcomingTravelReservations());

        expect(result.current).toHaveLength(2);
        expect(result.current.at(0)?.reservation.reservationID).toBe('PNR_TRIP2');
        expect(result.current.at(0)?.reportID).toBe('501');
        expect(result.current.at(1)?.reservation.reservationID).toBe('PNR_TRIP1');
        expect(result.current.at(1)?.reportID).toBe('500');
    });

    it('should return empty array when trip room has no tripData payload', async () => {
        const tripRoom: Report = {
            reportID: '600',
            type: CONST.REPORT.TYPE.CHAT,
            chatType: CONST.REPORT.CHAT_TYPE.TRIP_ROOM,
            reportName: 'Empty trip',
            policyID: 'policy1',
        } as Report;

        await Onyx.merge(`${ONYXKEYS.COLLECTION.REPORT}600`, tripRoom);
        await waitForBatchedUpdates();

        const {result} = renderHook(() => useUpcomingTravelReservations());

        expect(result.current).toEqual([]);
    });
});
