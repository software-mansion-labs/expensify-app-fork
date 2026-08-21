import type {IOUType} from '@src/CONST';
import CONST from '@src/CONST';
import type {BillingGraceEndPeriod, Policy} from '@src/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

import {isGroupPolicy} from './PolicyUtils';
import {shouldRestrictUserBillableActions} from './SubscriptionUtils';

/**
 * @param defaultExpensePolicyOwnerBillingGraceEndPeriod the SHARED_NVP_PRIVATE_USER_BILLING_GRACE_PERIOD_END entry of
 * the default expense policy's owner (the member keyed by `defaultExpensePolicy.ownerAccountID`).
 */
function shouldUseDefaultExpensePolicy(
    iouType: IOUType,
    defaultExpensePolicy: OnyxEntry<Policy> | null,
    amountOwed: OnyxEntry<number>,
    defaultExpensePolicyOwnerBillingGraceEndPeriod: OnyxEntry<BillingGraceEndPeriod>,
    ownerBillingGracePeriodEnd: OnyxEntry<number>,
    currentUserAccountID: number,
) {
    if (iouType !== CONST.IOU.TYPE.CREATE || !defaultExpensePolicy || !isGroupPolicy(defaultExpensePolicy)) {
        return false;
    }

    return !shouldRestrictUserBillableActions(defaultExpensePolicy, ownerBillingGracePeriodEnd, defaultExpensePolicyOwnerBillingGraceEndPeriod, amountOwed, currentUserAccountID);
}

export default shouldUseDefaultExpensePolicy;
