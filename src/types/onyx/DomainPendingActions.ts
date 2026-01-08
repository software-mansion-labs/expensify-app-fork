import type * as OnyxCommon from './OnyxCommon';

/**
 * General pending action structure for domain admins
 */
type GeneralDomainPendingAction = {
    /**
     * Base pending actions
     */
    pendingAction: OnyxCommon.PendingAction;

    /**
     *
     */
    twoFactorAuthExemptEmails: OnyxCommon.PendingAction;
};

/**
 * Pending actions triggered by user operations on the domain
 */
type DomainPendingAction = {
    /**
     * Pending actions for specific administrators, keyed by their accountID
     */
    admin?: Record<number, GeneralDomainPendingAction>;

    /**
     *
     */
    member?: Record<number, GeneralDomainPendingAction>;

    /**
     * Pending action for the technical contact email
     */
    technicalContactEmail?: OnyxCommon.PendingAction;

    /**
     * Pending action for the "use technical contact billing card" setting
     */
    useTechnicalContactBillingCard?: OnyxCommon.PendingAction;

    /**
     * Pending action for the 2FA toggle
     */
    twoFactorAuthRequired?: OnyxCommon.PendingAction;
};

export default DomainPendingAction;
