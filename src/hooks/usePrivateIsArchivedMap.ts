import {registerSessionCleanupCallback} from '@libs/SessionCleanup';

import ONYXKEYS from '@src/ONYXKEYS';
import type {ReportNameValuePairs} from '@src/types/onyx';

import type {OnyxCollection} from 'react-native-onyx';

import useOnyx from './useOnyx';

type PrivateIsArchivedMap = Record<string, boolean>;

// Single-entry cache so the derived map keeps a stable reference across renders and remounts
// while the underlying REPORT_NAME_VALUE_PAIRS collection is referentially unchanged.
// Reference equality on the source is reliable: Onyx hands every subscriber the same frozen
// collection snapshot and rebuilds it only when a member changes (see OnyxCache.getCollectionData
// in react-native-onyx), and a changed reference only costs a map rebuild here.
let cachedSource: OnyxCollection<ReportNameValuePairs>;
let cachedMap: PrivateIsArchivedMap = {};
let hasCached = false;

// The cached collection belongs to the signed-in account, so release it on sign-out
// rather than holding it until the next subscriber mounts.
registerSessionCleanupCallback(() => {
    cachedSource = undefined;
    cachedMap = {};
    hasCached = false;
});

function buildPrivateIsArchivedMap(allReportNVP: OnyxCollection<ReportNameValuePairs>): PrivateIsArchivedMap {
    if (hasCached && allReportNVP === cachedSource) {
        return cachedMap;
    }

    const map: PrivateIsArchivedMap = {};
    if (allReportNVP) {
        for (const [key, value] of Object.entries(allReportNVP)) {
            map[key] = !!value?.private_isArchived;
        }
    }

    cachedSource = allReportNVP;
    cachedMap = map;
    hasCached = true;
    return map;
}

/**
 * Hook that returns a map of report IDs to their private_isArchived values
 */
function usePrivateIsArchivedMap(): PrivateIsArchivedMap {
    const [allReportNVP] = useOnyx(ONYXKEYS.COLLECTION.REPORT_NAME_VALUE_PAIRS);
    return buildPrivateIsArchivedMap(allReportNVP);
}

export default usePrivateIsArchivedMap;
export type {PrivateIsArchivedMap};
