/** The pages of the NonUSD owners step. The values are the `subPage` param of the URL. */
const OWNERS_PAGES = {
    IS_USER_BENEFICIAL_OWNER: 'is-user-beneficial-owner',
    IS_ANYONE_ELSE_BENEFICIAL_OWNER: 'is-anyone-else-beneficial-owner',
    NAME: 'name',
    OWNERSHIP_PERCENTAGE: 'ownership-percentage',
    CONFIRMATION: 'confirmation',
    ARE_THERE_MORE_BENEFICIAL_OWNERS: 'are-there-more-beneficial-owners',
    BENEFICIAL_OWNERS_LIST: 'beneficial-owners-list',
} as const;

export default OWNERS_PAGES;
