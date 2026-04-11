import {useMemo} from 'react';
import type {OnyxCollection} from 'react-native-onyx';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ReportMetadata} from '@src/types/onyx';
import useOnyx from './useOnyx';

const actionLoadingIdsSelector = (reportMetadata: OnyxCollection<ReportMetadata>): string[] => {
    if (!reportMetadata) {
        return [];
    }
    const ids: string[] = [];
    for (const [key, value] of Object.entries(reportMetadata)) {
        if (value?.isActionLoading) {
            ids.push(key);
        }
    }
    return ids.sort();
};

function useActionLoadingReportIDs(): ReadonlySet<string> {
    const [actionLoadingIds = CONST.EMPTY_ARRAY] = useOnyx(ONYXKEYS.COLLECTION.REPORT_METADATA, {selector: actionLoadingIdsSelector});

    return useMemo(() => new Set(actionLoadingIds), [actionLoadingIds]);
}

export default useActionLoadingReportIDs;
