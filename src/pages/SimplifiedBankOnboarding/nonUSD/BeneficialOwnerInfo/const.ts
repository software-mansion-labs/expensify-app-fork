/**
 * Constants that the outer pages, the details form and the helpers of the NonUSD owner step share.
 */

// The position of this step in the step counter of the header
const STEP_INDEX = 3;

/** The fields of one owner, the last part of its flat draft keys and the field names that the server stores */
const OWNER_FIELDS = {
    FULL_NAME: 'fullName',
    OWNERSHIP_PERCENTAGE: 'ownershipPercentage',
} as const;

export {OWNER_FIELDS, STEP_INDEX};
