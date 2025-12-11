import type * as OnyxTypes from '@src/types/onyx';
import ONYXKEYS from '@src/ONYXKEYS';
import getEmptyArray from '@src/types/utils/getEmptyArray';

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
            .filter((id) => !Number.isNaN(id)) ?? getEmptyArray<string>()
    );
}

export default selectAdminIDs;

