/** The five LHN groups, in the order the LHN shows them. */
const LHN_ORDER_BUCKET = {
    PINNED_AND_GBR: 0,
    ERROR: 1,
    DRAFT: 2,
    NON_ARCHIVED: 3,
    ARCHIVED: 4,
} as const;

export default LHN_ORDER_BUCKET;
