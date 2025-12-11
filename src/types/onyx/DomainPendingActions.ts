import type * as OnyxCommon from './OnyxCommon';

/**
 * Pending actions triggered by user operations on the domain
 */
type DomainPendingAction = {
    /**
     * Pending action for the use technical contact billing card setting
     */
    useTechnicalContactBillingCard?: OnyxCommon.PendingAction;

    /**
     * Pending action for the technical contact email
     */
    technicalContactEmail?: OnyxCommon.PendingAction;

    /**
     * Pending actions for specific administrators, keyed by their accountID
     */
    admin?: Record<number, OnyxCommon.PendingAction>;

    /**
     * General pending action for the domain itself
     */
    pendingAction?: OnyxCommon.PendingAction;
};

export default DomainPendingAction;
