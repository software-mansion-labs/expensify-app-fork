/**
 * The props of the sub pages of the details form of one owner. Next to the owner ID and the values of the owner that the
 * step resolved, they get the share of every owner, because the percentage page checks that the total stays at 100 or
 * below.
 */
import type {SubPageProps} from '@hooks/useSubPage/types';

import type {GlobalOwnerValues} from '@pages/SimplifiedBankOnboarding/values/codecs/nonUSDBeneficialOwners';

type BeneficialOwnerSubPageProps = SubPageProps & {
    ownerBeingModifiedID: string;

    /** The owner fields, from the draft first and then from the saved owner with the same ID */
    ownerValues: GlobalOwnerValues;

    /** The share of every owner in the list, by owner ID */
    totalOwnedPercentage: Record<string, number>;
};

export default BeneficialOwnerSubPageProps;
