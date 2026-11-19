/**
 * Constants that the outer pages, the details form and the helpers of the NonUSD owner step share.
 */

// The position of this step in the step counter of the header
const STEP_INDEX = 3;

/** The fields of one owner, the last part of its flat draft keys. The server stores the two names joined as `fullName`. */
const OWNER_FIELDS = {
    FIRST_NAME: 'firstName',
    LAST_NAME: 'lastName',
    OWNERSHIP_PERCENTAGE: 'ownershipPercentage',
} as const;

export {OWNER_FIELDS, STEP_INDEX};
