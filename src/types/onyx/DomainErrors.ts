import type * as OnyxCommon from './OnyxCommon';

/**
 * Collection of errors related to domain operations received from the backend
 */
type DomainErrors = {
    /**
     * Errors related to the "use technical contact billing card" setting
     */
    useTechnicalContactBillingCardErrors?: OnyxCommon.Errors;

    /**
     * Errors related to the technical contact email
     */
    technicalContactEmailErrors?: OnyxCommon.Errors;

    /**
     * Errors related to specific domain administrators, keyed by their adminID
     */
    adminErrors?: Record<number, OnyxCommon.Errors>;

    /**
     * Errors returned when attempting to remove the domain
     */
    removeDomainError?: OnyxCommon.Errors;
};

export default DomainErrors;
