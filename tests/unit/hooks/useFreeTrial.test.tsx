import {act, render, renderHook} from '@testing-library/react-native';

import useHasTeam2025Pricing from '@hooks/useHasTeam2025Pricing';
import useSubscriptionPlan from '@hooks/useSubscriptionPlan';

import {getOwnedPaidPolicies} from '@libs/PolicyUtils';
import {calculateRemainingFreeTrialDays, doesUserHavePaymentCardAdded, getEarlyDiscountInfo, isUserOnFreeTrial, shouldShowDiscountBanner} from '@libs/SubscriptionUtils';

import useFreeTrial from '@pages/home/FreeTrialSection/useFreeTrial';
import type {FreeTrialState} from '@pages/home/FreeTrialSection/useFreeTrial';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import {Activity} from 'react';
import Onyx from 'react-native-onyx';

import createMock from '../../utils/createMock';
import waitForBatchedUpdates from '../../utils/waitForBatchedUpdates';

jest.mock('@hooks/useHasTeam2025Pricing', () => ({
    __esModule: true,
    default: jest.fn(() => false),
}));

jest.mock('@hooks/useSubscriptionPlan', () => ({
    __esModule: true,
    default: jest.fn(() => 'corporate'),
}));

jest.mock('@libs/PolicyUtils', () => ({
    getOwnedPaidPolicies: jest.fn(() => [{id: 'policyID'}]),
}));

jest.mock('@libs/SubscriptionUtils', () => ({
    shouldShowDiscountBanner: jest.fn(() => false),
    getEarlyDiscountInfo: jest.fn(() => null),
    isUserOnFreeTrial: jest.fn(() => false),
    doesUserHavePaymentCardAdded: jest.fn(() => true),
    calculateRemainingFreeTrialDays: jest.fn(() => 0),
}));

const mockedUseHasTeam2025Pricing = jest.mocked(useHasTeam2025Pricing);
const mockedUseSubscriptionPlan = jest.mocked(useSubscriptionPlan);
const mockedGetOwnedPaidPolicies = jest.mocked(getOwnedPaidPolicies);
const mockedShouldShowDiscountBanner = jest.mocked(shouldShowDiscountBanner);
const mockedGetEarlyDiscountInfo = jest.mocked(getEarlyDiscountInfo);
const mockedIsUserOnFreeTrial = jest.mocked(isUserOnFreeTrial);
const mockedDoesUserHavePaymentCardAdded = jest.mocked(doesUserHavePaymentCardAdded);
const mockedCalculateRemainingFreeTrialDays = jest.mocked(calculateRemainingFreeTrialDays);

function FreeTrialProbe({onRender}: {onRender: (state: FreeTrialState) => void}) {
    onRender(useFreeTrial());
    return null;
}

describe('useFreeTrial', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        await Onyx.clear();
        await waitForBatchedUpdates();
        jest.clearAllMocks();
        mockedGetOwnedPaidPolicies.mockReturnValue([createMock<ReturnType<typeof getOwnedPaidPolicies>[number]>({id: 'policyID'})]);
    });

    afterEach(async () => {
        await Onyx.clear();
    });

    describe('section visibility', () => {
        it('should not show section when user is not on free trial', () => {
            mockedIsUserOnFreeTrial.mockReturnValue(false);
            mockedDoesUserHavePaymentCardAdded.mockReturnValue(false);

            const {result} = renderHook(() => useFreeTrial());

            expect(result.current.shouldShowFreeTrialSection).toBe(false);
        });

        it('should not show section when user already has a billing card', () => {
            mockedIsUserOnFreeTrial.mockReturnValue(true);
            mockedDoesUserHavePaymentCardAdded.mockReturnValue(true);

            const {result} = renderHook(() => useFreeTrial());

            expect(result.current.shouldShowFreeTrialSection).toBe(false);
        });

        it('should show section when user is on free trial and has no billing card', () => {
            mockedIsUserOnFreeTrial.mockReturnValue(true);
            mockedDoesUserHavePaymentCardAdded.mockReturnValue(false);
            mockedCalculateRemainingFreeTrialDays.mockReturnValue(15);

            const {result} = renderHook(() => useFreeTrial());

            expect(result.current.shouldShowFreeTrialSection).toBe(true);
        });

        it("should not show section when user doesn't own any paid workspaces", () => {
            mockedIsUserOnFreeTrial.mockReturnValue(true);
            mockedDoesUserHavePaymentCardAdded.mockReturnValue(false);
            mockedGetOwnedPaidPolicies.mockReturnValue([]);

            const {result} = renderHook(() => useFreeTrial());

            expect(result.current.shouldShowFreeTrialSection).toBe(false);
        });
    });

    describe('discount state - 50% off (first 24 hours)', () => {
        it('should return discountType 50 when discount banner is active and within first 24 hours', () => {
            mockedIsUserOnFreeTrial.mockReturnValue(true);
            mockedDoesUserHavePaymentCardAdded.mockReturnValue(false);
            mockedShouldShowDiscountBanner.mockReturnValue(true);
            mockedGetEarlyDiscountInfo.mockReturnValue({discountType: 50, days: 0, hours: 20, minutes: 30, seconds: 15});
            mockedCalculateRemainingFreeTrialDays.mockReturnValue(30);

            const {result} = renderHook(() => useFreeTrial());

            expect(result.current.shouldShowFreeTrialSection).toBe(true);
            expect(result.current.discountType).toBe(50);
        });
    });

    describe('discount state - 25% off (days 2-7)', () => {
        it('should return discountType 25 when discount banner is active and past first 24 hours', () => {
            mockedIsUserOnFreeTrial.mockReturnValue(true);
            mockedDoesUserHavePaymentCardAdded.mockReturnValue(false);
            mockedShouldShowDiscountBanner.mockReturnValue(true);
            mockedGetEarlyDiscountInfo.mockReturnValue({discountType: 25, days: 5, hours: 12, minutes: 0, seconds: 0});
            mockedCalculateRemainingFreeTrialDays.mockReturnValue(25);

            const {result} = renderHook(() => useFreeTrial());

            expect(result.current.shouldShowFreeTrialSection).toBe(true);
            expect(result.current.discountType).toBe(25);
        });
    });

    describe('no discount (days 8-30)', () => {
        it('should return discountType null when no discount is available but trial is active', () => {
            mockedIsUserOnFreeTrial.mockReturnValue(true);
            mockedDoesUserHavePaymentCardAdded.mockReturnValue(false);
            mockedShouldShowDiscountBanner.mockReturnValue(false);
            mockedGetEarlyDiscountInfo.mockReturnValue(null);
            mockedCalculateRemainingFreeTrialDays.mockReturnValue(10);

            const {result} = renderHook(() => useFreeTrial());

            expect(result.current.shouldShowFreeTrialSection).toBe(true);
            expect(result.current.discountType).toBeNull();
        });
    });

    describe('daysLeft', () => {
        it('should return the remaining trial days from calculateRemainingFreeTrialDays', () => {
            mockedIsUserOnFreeTrial.mockReturnValue(true);
            mockedDoesUserHavePaymentCardAdded.mockReturnValue(false);
            mockedCalculateRemainingFreeTrialDays.mockReturnValue(12);

            const {result} = renderHook(() => useFreeTrial());

            expect(result.current.daysLeft).toBe(12);
        });
    });

    describe('discountInfo', () => {
        it('should return discount info from getEarlyDiscountInfo when on trial', () => {
            mockedIsUserOnFreeTrial.mockReturnValue(true);
            mockedDoesUserHavePaymentCardAdded.mockReturnValue(false);
            mockedShouldShowDiscountBanner.mockReturnValue(true);
            mockedCalculateRemainingFreeTrialDays.mockReturnValue(5);
            mockedGetEarlyDiscountInfo.mockReturnValue({discountType: 50, days: 0, hours: 23, minutes: 59, seconds: 30});

            const {result} = renderHook(() => useFreeTrial());

            expect(result.current.discountInfo).toEqual({discountType: 50, days: 0, hours: 23, minutes: 59, seconds: 30});
        });

        it('should return null for discountInfo when getEarlyDiscountInfo returns null', () => {
            mockedIsUserOnFreeTrial.mockReturnValue(true);
            mockedDoesUserHavePaymentCardAdded.mockReturnValue(false);
            mockedCalculateRemainingFreeTrialDays.mockReturnValue(5);
            mockedGetEarlyDiscountInfo.mockReturnValue(null);

            const {result} = renderHook(() => useFreeTrial());

            expect(result.current.discountInfo).toBeNull();
        });
    });

    describe('hook dependencies', () => {
        it('should call isUserOnFreeTrial with correct trial dates from Onyx', async () => {
            const firstDayFreeTrial = '2026-03-01 00:00:00';
            const lastDayFreeTrial = '2026-03-31 00:00:00';

            await Onyx.merge(ONYXKEYS.NVP_FIRST_DAY_FREE_TRIAL, firstDayFreeTrial);
            await Onyx.merge(ONYXKEYS.NVP_LAST_DAY_FREE_TRIAL, lastDayFreeTrial);
            await waitForBatchedUpdates();

            mockedIsUserOnFreeTrial.mockReturnValue(true);
            mockedDoesUserHavePaymentCardAdded.mockReturnValue(false);
            mockedCalculateRemainingFreeTrialDays.mockReturnValue(20);

            renderHook(() => useFreeTrial());

            expect(mockedIsUserOnFreeTrial).toHaveBeenCalledWith(firstDayFreeTrial, lastDayFreeTrial);
        });

        it('should call doesUserHavePaymentCardAdded with billing fund ID from Onyx', async () => {
            const userBillingFundID = 12345;

            await Onyx.merge(ONYXKEYS.NVP_BILLING_FUND_ID, userBillingFundID);
            await waitForBatchedUpdates();

            mockedIsUserOnFreeTrial.mockReturnValue(true);
            mockedDoesUserHavePaymentCardAdded.mockReturnValue(true);

            renderHook(() => useFreeTrial());

            expect(mockedDoesUserHavePaymentCardAdded).toHaveBeenCalledWith(userBillingFundID);
        });

        it('should call shouldShowDiscountBanner with correct parameters', async () => {
            const firstDayFreeTrial = '2026-03-01 00:00:00';
            const lastDayFreeTrial = '2026-03-31 00:00:00';
            const userBillingFundID = 12345;

            await Onyx.merge(ONYXKEYS.NVP_FIRST_DAY_FREE_TRIAL, firstDayFreeTrial);
            await Onyx.merge(ONYXKEYS.NVP_LAST_DAY_FREE_TRIAL, lastDayFreeTrial);
            await Onyx.merge(ONYXKEYS.NVP_BILLING_FUND_ID, userBillingFundID);
            await waitForBatchedUpdates();

            mockedUseHasTeam2025Pricing.mockReturnValue(true);
            mockedUseSubscriptionPlan.mockReturnValue('team');
            mockedIsUserOnFreeTrial.mockReturnValue(false);

            renderHook(() => useFreeTrial());

            expect(mockedShouldShowDiscountBanner).toHaveBeenCalledWith(CONST.DEFAULT_NUMBER_ID, true, 'team', firstDayFreeTrial, lastDayFreeTrial, userBillingFundID, {});
        });

        it('should call calculateRemainingFreeTrialDays with lastDayFreeTrial', async () => {
            const lastDayFreeTrial = '2026-03-31 00:00:00';

            await Onyx.merge(ONYXKEYS.NVP_LAST_DAY_FREE_TRIAL, lastDayFreeTrial);
            await waitForBatchedUpdates();

            mockedIsUserOnFreeTrial.mockReturnValue(true);
            mockedDoesUserHavePaymentCardAdded.mockReturnValue(false);
            mockedCalculateRemainingFreeTrialDays.mockReturnValue(20);

            renderHook(() => useFreeTrial());

            expect(mockedCalculateRemainingFreeTrialDays).toHaveBeenCalledWith(lastDayFreeTrial);
        });
    });

    describe('discount type exclusivity', () => {
        it('should return discountType 50 and not 25 when discountType is 50', () => {
            mockedIsUserOnFreeTrial.mockReturnValue(true);
            mockedDoesUserHavePaymentCardAdded.mockReturnValue(false);
            mockedShouldShowDiscountBanner.mockReturnValue(true);
            mockedGetEarlyDiscountInfo.mockReturnValue({discountType: 50, days: 0, hours: 20, minutes: 0, seconds: 0});
            mockedCalculateRemainingFreeTrialDays.mockReturnValue(30);

            const {result} = renderHook(() => useFreeTrial());

            expect(result.current.discountType).toBe(50);
        });

        it('should return discountType 25 and not 50 when discountType is 25', () => {
            mockedIsUserOnFreeTrial.mockReturnValue(true);
            mockedDoesUserHavePaymentCardAdded.mockReturnValue(false);
            mockedShouldShowDiscountBanner.mockReturnValue(true);
            mockedGetEarlyDiscountInfo.mockReturnValue({discountType: 25, days: 5, hours: 0, minutes: 0, seconds: 0});
            mockedCalculateRemainingFreeTrialDays.mockReturnValue(25);

            const {result} = renderHook(() => useFreeTrial());

            expect(result.current.discountType).toBe(25);
        });

        it('should return discountType null when discount banner should not be shown', () => {
            mockedIsUserOnFreeTrial.mockReturnValue(true);
            mockedDoesUserHavePaymentCardAdded.mockReturnValue(false);
            mockedShouldShowDiscountBanner.mockReturnValue(false);
            mockedGetEarlyDiscountInfo.mockReturnValue({discountType: 50, days: 0, hours: 20, minutes: 0, seconds: 0});
            mockedCalculateRemainingFreeTrialDays.mockReturnValue(30);

            const {result} = renderHook(() => useFreeTrial());

            expect(result.current.discountType).toBeNull();
        });
    });

    describe('discount countdown freshness', () => {
        let latestState: FreeTrialState | undefined;
        const recordState = (state: FreeTrialState) => {
            latestState = state;
        };

        beforeEach(() => {
            jest.useFakeTimers();
            latestState = undefined;
            mockedIsUserOnFreeTrial.mockReturnValue(true);
            mockedDoesUserHavePaymentCardAdded.mockReturnValue(false);
            mockedCalculateRemainingFreeTrialDays.mockReturnValue(20);
            mockedShouldShowDiscountBanner.mockReturnValue(true);
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should refresh the discount on reveal when the 24 hour mark passed while hidden', () => {
            // Given a 50% countdown that ticked once while the screen was visible
            mockedGetEarlyDiscountInfo.mockReturnValue({discountType: 50, days: 0, hours: 1, minutes: 0, seconds: 50});
            const probe = <FreeTrialProbe onRender={recordState} />;
            const {rerender} = render(<Activity mode="visible">{probe}</Activity>);
            act(() => {
                mockedGetEarlyDiscountInfo.mockReturnValue({discountType: 50, days: 0, hours: 1, minutes: 0, seconds: 49});
                jest.advanceTimersByTime(CONST.MILLISECONDS_PER_SECOND);
            });
            expect(latestState?.discountInfo?.seconds).toBe(49);

            // When the screen stays hidden past the 24 hour mark and is revealed again without re-rendering the hook
            rerender(<Activity mode="hidden">{probe}</Activity>);
            act(() => {
                mockedGetEarlyDiscountInfo.mockReturnValue({discountType: 25, days: 5, hours: 22, minutes: 0, seconds: 10});
                jest.advanceTimersByTime(2 * 60 * 60 * CONST.MILLISECONDS_PER_SECOND);
            });
            // Then the covered screen keeps the pre-hide countdown instead of blanking the banner
            expect(latestState?.discountInfo?.seconds).toBe(49);
            rerender(<Activity mode="visible">{probe}</Activity>);
            act(() => {
                jest.advanceTimersByTime(0);
            });

            // Then the immediate refresh shows the 25% offer instead of the pre-hide 50% countdown
            expect(latestState?.discountType).toBe(25);
            expect(latestState?.discountInfo).toEqual({discountType: 25, days: 5, hours: 22, minutes: 0, seconds: 10});
        });

        it('should drop the discount on reveal when the offer ended while hidden', () => {
            // Given a 25% countdown that ticked once while the screen was visible
            mockedGetEarlyDiscountInfo.mockReturnValue({discountType: 25, days: 0, hours: 0, minutes: 5, seconds: 0});
            const probe = <FreeTrialProbe onRender={recordState} />;
            const {rerender} = render(<Activity mode="visible">{probe}</Activity>);
            act(() => {
                mockedGetEarlyDiscountInfo.mockReturnValue({discountType: 25, days: 0, hours: 0, minutes: 4, seconds: 59});
                jest.advanceTimersByTime(CONST.MILLISECONDS_PER_SECOND);
            });
            expect(latestState?.discountType).toBe(25);

            // When the screen stays hidden past the end of the offer and is revealed again without re-rendering the hook
            rerender(<Activity mode="hidden">{probe}</Activity>);
            act(() => {
                mockedGetEarlyDiscountInfo.mockReturnValue(null);
                mockedShouldShowDiscountBanner.mockReturnValue(false);
                jest.advanceTimersByTime(60 * 60 * CONST.MILLISECONDS_PER_SECOND);
            });
            rerender(<Activity mode="visible">{probe}</Activity>);
            act(() => {
                jest.advanceTimersByTime(0);
            });

            // Then the immediate refresh removes the expired offer instead of showing the pre-hide countdown
            expect(latestState?.discountType).toBeNull();
            expect(latestState?.discountInfo).toBeNull();
        });

        it('should not resurface the last countdown when the discount applies again', () => {
            // Given a 50% countdown that ticked once
            mockedGetEarlyDiscountInfo.mockReturnValue({discountType: 50, days: 0, hours: 1, minutes: 0, seconds: 50});
            const {rerender} = render(<FreeTrialProbe onRender={recordState} />);
            act(() => {
                mockedGetEarlyDiscountInfo.mockReturnValue({discountType: 50, days: 0, hours: 1, minutes: 0, seconds: 49});
                jest.advanceTimersByTime(CONST.MILLISECONDS_PER_SECOND);
            });

            // When the discount stops applying for a minute
            mockedShouldShowDiscountBanner.mockReturnValue(false);
            rerender(<FreeTrialProbe onRender={recordState} />);
            expect(latestState?.discountInfo).toBeNull();
            act(() => {
                mockedGetEarlyDiscountInfo.mockReturnValue({discountType: 25, days: 5, hours: 0, minutes: 0, seconds: 5});
                jest.advanceTimersByTime(60 * CONST.MILLISECONDS_PER_SECOND);
            });

            // Then the hook never returns the countdown from a minute ago once the discount applies again
            mockedShouldShowDiscountBanner.mockReturnValue(true);
            rerender(<FreeTrialProbe onRender={recordState} />);
            expect(latestState?.discountInfo).toBeNull();
            act(() => {
                jest.advanceTimersByTime(0);
            });
            expect(latestState?.discountType).toBe(25);
            expect(latestState?.discountInfo).toEqual({discountType: 25, days: 5, hours: 0, minutes: 0, seconds: 5});
        });
    });
});
