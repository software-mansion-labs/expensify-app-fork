import type * as OnyxCommon from './OnyxCommon';

/**
 *
 */
type DomainPendingAction = {
    /**
     *
     */
    useTechnicalContactBillingCard?: OnyxCommon.PendingAction;

    /**
     *
     */
    technicalContactEmail?: OnyxCommon.PendingAction;

    /**
     *
     */
    admin?: Record<number, OnyxCommon.PendingAction>;
};

export default DomainPendingAction;
