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
    admin?: Record<string, OnyxCommon.Errors>;

};

export default DomainErrors;
