import type CONST from '@src/CONST';
import type PrefixedRecord from '@src/types/utils/PrefixedRecord';
import type * as OnyxCommon from './OnyxCommon';

/**
 * General pending action structure for domain members
 * Pending actions structure is dictated by how `domain_` updates are handled in the app to prevent them from resetting unintentionally.
 */
type GeneralDomainMemberPendingAction = {
    /**
     * Base pending actions
     */
    pendingAction: OnyxCommon.PendingAction;
};

/**
 * Represents the pending actions related to a domain's security group.
 */
type DomainSecurityGroupPendingActions = {
    /**
     * Pending action for the security group name
     */
    name?: OnyxCommon.PendingAction;

    /**
     * Pending action for the default security group ID
     */
    defaultSecurityGroupID?: OnyxCommon.PendingAction;

    /**
     *
     */
    enableStrictPolicyRules?: OnyxCommon.PendingAction;
};

/**
 * Pending actions triggered by user operations on the domain
 */
type DomainPendingAction = {
    /**
     * Pending actions for specific administrators, keyed by their accountID
     */
    admin?: Record<number, GeneralDomainMemberPendingAction>;

    /**
     * Pending action for the technical contact email
     */
    technicalContactEmail?: OnyxCommon.PendingAction;

    /**
     * Pending action for the "use technical contact billing card" setting
     */
    useTechnicalContactBillingCard?: OnyxCommon.PendingAction;

    /**
     * Pending actions for specific domain member, keyed by their email
     */
    member?: Record<string | number, GeneralDomainMemberPendingAction>;

    /**
     * Pending action for the 2FA toggle
     */
    twoFactorAuthRequired?: OnyxCommon.PendingAction;

    /**
     * Pending action for the domain itself
     */
    pendingAction?: OnyxCommon.PendingAction;
} & PrefixedRecord<typeof CONST.DOMAIN.DOMAIN_SECURITY_GROUP_PREFIX, DomainSecurityGroupPendingActions>;

export type {DomainSecurityGroupPendingActions};
export default DomainPendingAction;
