import useEnvironment from '@hooks/useEnvironment';
import useOnyx from '@hooks/useOnyx';
import useStyleUtils from '@hooks/useStyleUtils';
import useThemeStyles from '@hooks/useThemeStyles';

import {getActiveServer} from '@libs/ApiUtils';
import * as Environment from '@libs/Environment/Environment';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import type {ValueOf} from 'type-fest';

import React from 'react';

import type {EnvironmentValue} from './EnvironmentContextProvider/types';

import pkg from '../../package.json';
import Badge from './Badge';

const ENVIRONMENT_SHORT_FORM = {
    [CONST.ENVIRONMENT.DEV]: 'DEV',
    [CONST.ENVIRONMENT.STAGING]: 'STG',
    [CONST.ENVIRONMENT.QA]: 'QA',
    [CONST.ENVIRONMENT.PRODUCTION]: 'PROD',
    [CONST.ENVIRONMENT.ADHOC]: 'ADHOC',
};

/**
 * Which environment the badge is *about*. That is the server the app sends requests to, not the environment
 * baked into the bundle: the server switches in the test tool change the former without touching the latter,
 * so a dev build with the QA switch on talks only to QA while still reporting itself as a dev build.
 */
function getBadgeEnvironment(activeServer: ValueOf<typeof CONST.SERVER>, environment: EnvironmentValue): EnvironmentValue {
    if (activeServer === CONST.SERVER.QA) {
        return CONST.ENVIRONMENT.QA;
    }

    if (activeServer === CONST.SERVER.STAGING) {
        return CONST.ENVIRONMENT.STAGING;
    }

    // Requests go to production. Only the bundled environment distinguishes a dev build from an ad-hoc one,
    // so it answers here — except on a staging build, which is talking to production despite its name.
    return environment === CONST.ENVIRONMENT.STAGING ? CONST.ENVIRONMENT.PRODUCTION : environment;
}

function EnvironmentBadge() {
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const {environment, isProduction} = useEnvironment();
    // Subscribed only to re-render when the switch flips; the value read is ApiUtils' own resolved answer
    // rather than the raw stored one, so the badge cannot claim a server the router is not using. A stored
    // 'qa' left over from a dev session does not make a production build talk to QA.
    useOnyx(ONYXKEYS.ACTIVE_SERVER);

    const badgeEnvironment = getBadgeEnvironment(getActiveServer(), environment);

    const adhoc = badgeEnvironment === CONST.ENVIRONMENT.ADHOC;
    const success = badgeEnvironment === CONST.ENVIRONMENT.STAGING;
    const error = badgeEnvironment !== CONST.ENVIRONMENT.STAGING && badgeEnvironment !== CONST.ENVIRONMENT.ADHOC;

    const badgeEnvironmentStyle = StyleUtils.getEnvironmentBadgeStyle(success, error, adhoc);

    // If we are on production, don't show any badge. A production build cannot switch servers, so this reads
    // the bundled environment: it is the one thing the switches can never change.
    if (isProduction) {
        return null;
    }

    const text = Environment.isInternalTestBuild() ? `v${pkg.version} PR:${CONST.PULL_REQUEST_NUMBER}` : ENVIRONMENT_SHORT_FORM[badgeEnvironment];

    return (
        <Badge
            success={success}
            error={error}
            text={text}
            badgeStyles={[styles.alignSelfStart, styles.headerEnvBadge, styles.environmentBadge, badgeEnvironmentStyle]}
            textStyles={styles.headerEnvBadgeText}
            environment={badgeEnvironment}
            pressable
        />
    );
}

export default EnvironmentBadge;
