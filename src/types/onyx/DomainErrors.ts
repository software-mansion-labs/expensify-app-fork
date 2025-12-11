import type * as OnyxCommon from './OnyxCommon';

/**
 *
 */
type DomainErrors = {
    /**
     *
     */
    useTechnicalContactBillingCardErrors?: OnyxCommon.Errors;

    /**
     *
     */
    technicalContactEmailErrors?: OnyxCommon.Errors;

    /**
     *
     */
    adminErrors?: Record<string, OnyxCommon.Errors>;

    /**
     *
     */
    removeDomainError?: OnyxCommon.Errors;
};

export default DomainErrors;
