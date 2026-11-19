/**
 * The props of the sub pages of the details form of one owner. Every sub page needs the ID of the owner, because the
 * owner fields live in the draft under keys built from it, and the values of the owner that the step resolved.
 */
import type {SubPageProps} from '@hooks/useSubPage/types';

import type {UBOValues} from '@pages/SimplifiedBankOnboarding/values/codecs/usdBeneficialOwners';

type BeneficialOwnerSubPageProps = SubPageProps & {
    beneficialOwnerBeingModifiedID: string;

    /** The owner fields, from the draft first and then from the saved owner with the same ID */
    ownerValues: UBOValues;
};

export default BeneficialOwnerSubPageProps;
