/**
 * The navigation calls of the engine. The screen of a flow hands the flow page the routes of that flow and the
 * controller decides where to go, so the engine knows no route of its own and no other module of it imports
 * `Navigation`.
 */
import Navigation from '@libs/Navigation/Navigation';

import type {FlowPosition} from '@pages/SimplifiedBankOnboarding/core/plan/position/position';

import type {Route} from '@src/ROUTES';

/** Where a flow lives in the app: the route of each of its positions and the ways out of it */
type FlowRoutes = {
    getPositionRoute: (position: FlowPosition) => Route;

    /** The page that opened the flow, which Back from the first page returns to. A flow opened from a link has none, so Back leaves it. */
    entryRoute?: Route;

    /** Leaves the flow, for the page that opened it or by closing the modal */
    exit: () => void;
};

function goToPosition(routes: FlowRoutes, position: FlowPosition) {
    Navigation.navigate(routes.getPositionRoute(position));
}

function goBackToPosition(routes: FlowRoutes, position: FlowPosition) {
    Navigation.goBack(routes.getPositionRoute(position));
}

/** Swaps the URL for another position without a new history entry, such as a redirect from an unreachable position */
function replacePosition(routes: FlowRoutes, position: FlowPosition) {
    Navigation.navigate(routes.getPositionRoute(position), {forceReplace: true});
}

/** Back from the first page of the flow returns to the entry page */
function goBackToEntry(routes: FlowRoutes) {
    if (!routes.entryRoute) {
        routes.exit();
        return;
    }
    Navigation.goBack(routes.entryRoute);
}

export {goBackToEntry, goBackToPosition, goToPosition, replacePosition};
export type {FlowRoutes};
