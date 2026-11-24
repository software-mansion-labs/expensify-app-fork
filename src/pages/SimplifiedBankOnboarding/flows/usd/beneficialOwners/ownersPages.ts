/** The pages of the USD owners step. The values are the `subPage` param of the URL. */
const OWNERS_PAGES = {
    IS_USER_UBO: 'is-user-ubo',
    IS_ANYONE_ELSE_UBO: 'is-anyone-else-ubo',
    LEGAL_NAME: 'legal-name',
    DATE_OF_BIRTH: 'date-of-birth',
    CONFIRMATION: 'confirmation',
    ARE_THERE_MORE_UBOS: 'are-there-more-ubos',
    UBOS_LIST: 'ubos-list',
} as const;

export default OWNERS_PAGES;
