import NAVIGATORS from '@src/NAVIGATORS';
import SCREENS from '@src/SCREENS';
import CENTRAL_PANE_TO_RHP_MAPPING from './CENTRAL_PANE_TO_RHP_MAPPING';
import getTopmostNestedRHPRoute from './getTopmostNestedRHPRoute';
import {CentralPaneName, NavigationPartialRoute, RootStackParamList, State} from './types';

/**
 * @param state - react-navigation state
 */
const getTopMostReportIDFromRHP = (state: State): string => {
    if (!state) {
        return '';
    }

    const topmostRightPane = state.routes.filter((route) => route.name === NAVIGATORS.RIGHT_MODAL_NAVIGATOR).at(-1);

    if (topmostRightPane?.state) {
        return getTopMostReportIDFromRHP(topmostRightPane.state);
    }

    const topmostRoute = state.routes.at(-1);

    if (topmostRoute?.state) {
        return getTopMostReportIDFromRHP(topmostRoute.state);
    }

    if (topmostRoute?.params && 'reportID' in topmostRoute.params && typeof topmostRoute.params.reportID === 'string') {
        return topmostRoute.params.reportID;
    }

    return '';
};

// Get matching central pane route for bottom tab navigator. e.g HOME -> REPORT
function getMatchingCentralPaneRouteForRHPState(state: State<RootStackParamList>): NavigationPartialRoute<CentralPaneName> {
    const defaultRoute = {name: SCREENS.REPORT};

    const topMostNestedRHPRoute = getTopmostNestedRHPRoute(state);

    if (!topMostNestedRHPRoute) {
        return defaultRoute;
    }

    for (const [centralPaneName, rhpNames] of Object.entries(CENTRAL_PANE_TO_RHP_MAPPING)) {
        if (rhpNames.includes(topMostNestedRHPRoute.name)) {
            return {name: centralPaneName as CentralPaneName, params: topMostNestedRHPRoute.params};
        }
    }

    return defaultRoute;
}

export default getMatchingCentralPaneRouteForRHPState;
