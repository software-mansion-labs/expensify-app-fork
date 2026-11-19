import type USDStepInput from '@pages/SimplifiedBankOnboarding/formConfig/usd/types';

/** What the owner pages read besides the USD step input. They are derived once so every page answers the same. */
type OwnersStepInput = USDStepInput & {
    /** The user owns 25% or more, so the user is an owner too and takes one of the places */
    isUserOwner: boolean;

    /** Undefined until the user answered whether anyone else owns 25% or more */
    hasOtherOwners: boolean | undefined;
    canAddMoreOwners: boolean;
};

export default OwnersStepInput;
