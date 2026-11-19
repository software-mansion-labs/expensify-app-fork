/**
 * The owner fields that the details form and the helpers of the NonUSD owner step share.
 */

/** The fields of one owner, the last part of its flat draft keys. The server stores the two names joined as `fullName`. */
const OWNER_FIELDS = {
    FIRST_NAME: 'firstName',
    LAST_NAME: 'lastName',
    OWNERSHIP_PERCENTAGE: 'ownershipPercentage',
} as const;

export default OWNER_FIELDS;
