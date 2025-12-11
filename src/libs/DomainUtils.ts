import ONYXKEYS from '@src/ONYXKEYS';
import type * as OnyxTypes from '@src/types/onyx';
import getEmptyArray from '@src/types/utils/getEmptyArray';

/**
 * Extracts a list of admin IDs (accountIDs) from the domain object.
 * * It filters the domain properties for keys starting with the admin permissions prefix
 * and returns the values as an array of numbers.
 *
 * @param domain - The domain object from Onyx
 * @returns An array of admin account IDs
 */
function selectAdminIDs(domain: OnyxTypes.Domain | undefined): number[] {
    if (!domain) {
        return [];
    }

    return (
        Object.entries(domain)
            .filter(([key]) => key.startsWith(ONYXKEYS.COLLECTION.DOMAIN_ADMIN_PERMISSIONS))
            .map(([, value]) => {
                const rawValue = typeof value === 'object' && value !== null && 'value' in value ? value.value : value;
                return Number(rawValue);
            })
            .filter((id) => !Number.isNaN(id)) ?? getEmptyArray<number>()
    );
}

/**
 * Finds the specific key in the domain object that corresponds to a given admin's accountID.
 *
 * @param domain - The domain object from Onyx
 * @param accountID - The account ID of the admin
 * @returns The key string (e.g. 'expensify_adminPermissions_<NUMBER>') or undefined if not found
 */
function getAdminKey(domain: OnyxTypes.Domain | undefined, accountID: number): string | undefined {
    if (!domain) {
        return undefined;
    }

    return Object.entries(domain).find(([key, value]) => {
        return key.startsWith(ONYXKEYS.COLLECTION.DOMAIN_ADMIN_PERMISSIONS) && Number(value) === accountID;
    })?.[0];
}

export {selectAdminIDs, getAdminKey};
