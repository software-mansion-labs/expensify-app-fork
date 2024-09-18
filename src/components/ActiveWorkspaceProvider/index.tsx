import {useNavigationState} from '@react-navigation/native';
import React, {useEffect, useMemo, useState} from 'react';
import ActiveWorkspaceContext from '@components/ActiveWorkspace/ActiveWorkspaceContext';
import * as SearchUtils from '@libs/SearchUtils';
import NAVIGATORS from '@src/NAVIGATORS';
import SCREENS from '@src/SCREENS';
import type ChildrenProps from '@src/types/utils/ChildrenProps';

function ActiveWorkspaceContextProvider({children}: ChildrenProps) {
    const [activeWorkspaceID, setActiveWorkspaceID] = useState<string | undefined>(undefined);

    const lastPolicyRoute = useNavigationState((state) =>
        state?.routes?.findLast((route) => route.name === NAVIGATORS.REPORTS_SPLIT_NAVIGATOR || route.name === SCREENS.SEARCH.CENTRAL_PANE),
    );

    const policyIDFromRouteParam = lastPolicyRoute?.params && 'policyID' in lastPolicyRoute.params ? (lastPolicyRoute?.params?.policyID as string) : '';
    const queryFromRouteParam = lastPolicyRoute?.params && 'q' in lastPolicyRoute.params ? (lastPolicyRoute.params.q as string) : '';

    useEffect(() => {
        if (!policyIDFromRouteParam) {
            return;
        }
        setActiveWorkspaceID(policyIDFromRouteParam);
    }, [policyIDFromRouteParam, setActiveWorkspaceID]);

    useEffect(() => {
        if (!queryFromRouteParam) {
            return;
        }

        const queryJSON = SearchUtils.buildSearchQueryJSON(queryFromRouteParam);
        if (!queryJSON) {
            return undefined;
        }
        setActiveWorkspaceID(SearchUtils.getPolicyIDFromSearchQuery(queryJSON));
    }, [queryFromRouteParam]);

    const value = useMemo(
        () => ({
            activeWorkspaceID,
            setActiveWorkspaceID,
        }),
        [activeWorkspaceID, setActiveWorkspaceID],
    );

    // @TODO Remember to handle saving activeWorkspaceID in the session storage
    // const setActiveWorkspaceID = useCallback((workspaceID: string | undefined) => {
    //     updateActiveWorkspaceID(workspaceID);
    //     if (workspaceID && sessionStorage) {
    //         sessionStorage?.setItem(CONST.SESSION_STORAGE_KEYS.ACTIVE_WORKSPACE_ID, workspaceID);
    //     } else {
    //         sessionStorage?.removeItem(CONST.SESSION_STORAGE_KEYS.ACTIVE_WORKSPACE_ID);
    //     }
    // }, []);

    return <ActiveWorkspaceContext.Provider value={value}>{children}</ActiveWorkspaceContext.Provider>;
}

export default ActiveWorkspaceContextProvider;
export {};
