import type {Route} from '@src/ROUTES';
import ROUTES from '@src/ROUTES';

const OLD_WORKSPACE_URL_PREFIX = 'workspace';

// The URL path prefix for workspace screens has been changed from /workspace to /settings/workspaces.
// When switching from OldDot to NewDot, the old path in exitTo param must be replaced with a new one.
function replaceOldWorkspaceUrlInExitToParam(url: Route | undefined) {
    if (url && url.startsWith(OLD_WORKSPACE_URL_PREFIX)) {
        return `${ROUTES.SETTINGS_WORKSPACES}${url.substring(OLD_WORKSPACE_URL_PREFIX.length)}` as Route;
    }
    return url;
}

export default replaceOldWorkspaceUrlInExitToParam;
