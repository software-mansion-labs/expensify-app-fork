/**
 * The props of the sub pages of the details form of one owner. Next to the owner ID, they get the share of every owner,
 * because the percentage page checks that the total stays at 100 or below.
 */
import type {SubPageProps} from '@hooks/useSubPage/types';

type BeneficialOwnerSubPageProps = SubPageProps & {
    ownerBeingModifiedID: string;

    /** The share of every owner in the list, by owner ID */
    totalOwnedPercentage: Record<string, number>;
};

export default BeneficialOwnerSubPageProps;
