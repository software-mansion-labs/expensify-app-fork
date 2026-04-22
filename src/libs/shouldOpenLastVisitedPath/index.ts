import type {Route} from '@src/ROUTES';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function shouldOpenLastVisitedPath(lastVisitedPath: Route) {
    // Cold start always lands on the home page to minimize splash screen duration.
    // Deep links are handled separately via DeepLinkHandler after the splash is hidden.
    return false;
}
