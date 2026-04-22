/* eslint-disable @typescript-eslint/naming-convention */
import type {LinkingOptions} from '@react-navigation/native';
import getAdaptedStateFromPath from '@libs/Navigation/helpers/getAdaptedStateFromPath';
import getPathFromState from '@libs/Navigation/helpers/getPathFromState';
import type {RootNavigatorParamList} from '@libs/Navigation/types';
import {config} from './config';
import prefixes from './prefixes';
import subscribe from './subscribe';

const linkingConfig: LinkingOptions<RootNavigatorParamList> = {
    // Always land on the HOME route at cold start. The initial deep link URL is still
    // captured inside DeepLinkHandler via Linking.getInitialURL() and dispatched through
    // openReportFromDeepLink after the splash screen hides.
    getInitialURL: () => Promise.resolve(null),
    getStateFromPath: getAdaptedStateFromPath,
    getPathFromState,
    prefixes,
    config,
    subscribe,
};

// eslint-disable-next-line import/prefer-default-export
export {linkingConfig};
