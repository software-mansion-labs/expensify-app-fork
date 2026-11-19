/**
 * The props of the sub pages of the details form of one owner. Every sub page needs the ID of the owner, because the
 * owner fields live in the draft under keys built from it.
 */
import type {SubPageProps} from '@hooks/useSubPage/types';

type BeneficialOwnerSubPageProps = SubPageProps & {
    beneficialOwnerBeingModifiedID: string;
};

export default BeneficialOwnerSubPageProps;
