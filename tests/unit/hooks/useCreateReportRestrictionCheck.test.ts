import {renderHook} from '@testing-library/react-native';

import useCreateReportRestrictionCheck from '@pages/iou/request/step/IOURequestStepReport/hooks/useCreateReportRestrictionCheck';

import type * as OnyxTypes from '@src/types/onyx';

import createMock from '../../utils/createMock';

const mockShouldRestrict = jest.fn<boolean, unknown[]>();

jest.mock('@libs/SubscriptionUtils', () => ({
    shouldRestrictUserBillableActions: (...args: unknown[]): boolean => mockShouldRestrict(...args),
}));

jest.mock('@hooks/useOnyx', () => ({
    __esModule: true,
    default: (key: string) => {
        if (key === 'sharedNVP_private_billingGracePeriodEnd_7') {
            return [{value: 123}];
        }
        if (key === 'nvp_private_billingGracePeriodEnd') {
            return [456];
        }
        if (key === 'nvp_private_amountOwed') {
            return [789];
        }
        return [undefined];
    },
}));

const session = createMock<OnyxTypes.Session>({accountID: 42});
const restrictedPolicy = createMock<OnyxTypes.Policy>({id: 'p1', ownerAccountID: 7});

describe('useCreateReportRestrictionCheck', () => {
    beforeEach(() => {
        mockShouldRestrict.mockReset();
    });

    it('returns false when no restriction policy is supplied (skip the subscription check)', () => {
        // Given the underlying restriction util would restrict
        mockShouldRestrict.mockReturnValue(true);

        // When the hook is rendered without a restriction policy
        const {result} = renderHook(() => useCreateReportRestrictionCheck(session, undefined));

        // Then the check short-circuits to false without consulting the util
        expect(result.current()).toBe(false);
        expect(mockShouldRestrict).not.toHaveBeenCalled();
    });

    it("forwards billing/grace-period state, the policy owner's entry, and accountID to shouldRestrictUserBillableActions", () => {
        // Given the underlying restriction util restricts
        mockShouldRestrict.mockReturnValue(true);

        // When the hook is rendered with a restriction policy whose owner has a billing grace period entry
        const {result} = renderHook(() => useCreateReportRestrictionCheck(session, restrictedPolicy));

        // Then the util receives the policy, the owner's member entry (not the whole collection), and the accountID
        expect(result.current()).toBe(true);
        expect(mockShouldRestrict).toHaveBeenCalledWith(restrictedPolicy, 456, {value: 123}, 789, 42);
    });

    it('returns whatever shouldRestrictUserBillableActions returns', () => {
        // Given the underlying restriction util does not restrict
        mockShouldRestrict.mockReturnValue(false);

        // When the hook is rendered with a restriction policy
        const {result} = renderHook(() => useCreateReportRestrictionCheck(session, restrictedPolicy));

        // Then the check returns the util's result
        expect(result.current()).toBe(false);
    });
});
