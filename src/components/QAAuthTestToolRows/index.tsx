import Button from '@components/ButtonComposed';
import Switch from '@components/Switch';
import TestToolRow from '@components/TestToolRow';
import Text from '@components/Text';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import {getActiveServer} from '@libs/ApiUtils';
import {getCloudflareLogoutURL, isQAAuthConfigured} from '@libs/CloudflareAccess/Config';
import {getCloudflareSignInOutcome} from '@libs/CloudflareAccess/finishSignInFromURL';
import DateUtils from '@libs/DateUtils';

import type {CloudflareAuthProbeResult, CloudflareAuthProbeStatus} from '@userActions/CloudflareProbe';
import {runCloudflareAuthProbe} from '@userActions/CloudflareProbe';
import {clearCloudflareSession, getCloudflareSession} from '@userActions/CloudflareSession';
import {openExternalLink} from '@userActions/Link';
import {setActiveServer} from '@userActions/User';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import {useState} from 'react';

/** The semantic probe outcomes are translated. The raw `detail` diagnostic stays verbatim */
const PROBE_STATUS_TRANSLATION_KEYS = {
    success: 'qaAuthStatusSuccess',
    reauthRequired: 'qaAuthStatusReauthRequired',
    signInFailed: 'qaAuthStatusSignInFailed',
    error: 'qaAuthStatusError',
} as const satisfies Record<CloudflareAuthProbeStatus, string>;

/** A failed round trip is otherwise invisible: the handler ran during boot, long before this mounts */
function getFailedRedirectResult(): CloudflareAuthProbeResult | null {
    // A live session (this boot's or another tab's) outranks a recorded failure. It is history at that point
    if (getCloudflareSession()) {
        return null;
    }
    const {outcome, errorMessage} = getCloudflareSignInOutcome();
    if (outcome === 'not-a-callback' || outcome === 'exchanging') {
        return null;
    }
    return {status: 'signInFailed', detail: errorMessage};
}

/**
 * Test-tool rows for the QA server auth flow, rendered only when the QA credentials are configured. With no
 * session, Run navigates the whole tab to Cloudflare, so a round trip's result only shows on the next press.
 */
function QAAuthTestToolRows() {
    const styles = useThemeStyles();
    const {translate, datetimeToCalendarTime} = useLocalize();

    const [activeServer = getActiveServer()] = useOnyx(ONYXKEYS.ACTIVE_SERVER);
    const isUsingQAServer = activeServer === CONST.SERVER.QA;

    const [isOperationRunning, setIsOperationRunning] = useState(false);
    // Seeded from the boot-time redirect outcome. An in-flight exchange's failure surfaces when Run joins it
    const [probeResult, setProbeResult] = useState<CloudflareAuthProbeResult | null>(getFailedRedirectResult);
    // Consecutive probes produce identical results, so without a changing element the button reads as dead
    const [probeCompletedAt, setProbeCompletedAt] = useState<string | null>(null);

    if (!isQAAuthConfigured()) {
        return null;
    }

    return (
        <>
            {/* Point the app at the Cloudflare Access-protected QA server. Toggling either way signs you out:
                QA is a separate database, so the same email is a different account there.
                Unlike the staging row in TestToolMenu this is shown to internal devs too — a local .env cannot
                reach qa.new.exops.io, so this switch is the only way to exercise the flow before it exists. */}
            <TestToolRow
                title={translate('initialSettingsPage.troubleshoot.useQAServer')}
                isTitleAccessible={false}
            >
                <Switch
                    accessibilityLabel={translate('initialSettingsPage.troubleshoot.useQAServer')}
                    isOn={isUsingQAServer}
                    onToggle={() => setActiveServer(isUsingQAServer ? CONST.SERVER.PRODUCTION : CONST.SERVER.QA)}
                />
            </TestToolRow>
            <TestToolRow title={translate('initialSettingsPage.troubleshoot.qaAuth')}>
                <Button
                    size={CONST.BUTTON_SIZE.SMALL}
                    isDisabled={isOperationRunning}
                    isLoading={isOperationRunning}
                    onPress={() => {
                        setIsOperationRunning(true);
                        // Never rejects. Failures come back as semantic results
                        runCloudflareAuthProbe({shouldRedirectOnReauthRequired: probeResult?.status === 'reauthRequired'})
                            .then((result) => {
                                setProbeResult(result);
                                setProbeCompletedAt(DateUtils.getDBTime());
                            })
                            .finally(() => setIsOperationRunning(false));
                    }}
                >
                    <Button.Text>{translate('initialSettingsPage.troubleshoot.qaAuthRunProbe')}</Button.Text>
                </Button>
            </TestToolRow>
            {/* Signing out of Cloudflare is what makes the next QA request show a real consent screen. Our own
                tokens have to go first: an unexpired one lets the gate skip the handshake entirely. Same tab,
                because a new one would leave this instance running against a server that rejects every request. */}
            <TestToolRow title={translate('initialSettingsPage.troubleshoot.qaAuthCloudflareIdentity')}>
                <Button
                    size={CONST.BUTTON_SIZE.SMALL}
                    isDisabled={isOperationRunning}
                    onPress={() => {
                        setIsOperationRunning(true);
                        clearCloudflareSession()
                            .then(() => openExternalLink(getCloudflareLogoutURL(), false, true))
                            .catch((error: unknown) => {
                                setProbeResult({status: 'error', detail: error instanceof Error ? error.message : undefined});
                                setProbeCompletedAt(DateUtils.getDBTime());
                            })
                            .finally(() => setIsOperationRunning(false));
                    }}
                >
                    <Button.Text>{translate('initialSettingsPage.troubleshoot.qaAuthCloudflareSignOut')}</Button.Text>
                </Button>
            </TestToolRow>
            {!!probeResult && (
                <Text style={styles.textLabelSupporting}>
                    {translate(`initialSettingsPage.troubleshoot.${PROBE_STATUS_TRANSLATION_KEYS[probeResult.status]}`)}
                    {probeResult.detail ? ` (${probeResult.detail})` : ''}
                    {probeCompletedAt ? ` — ${datetimeToCalendarTime(probeCompletedAt, false)}` : ''}
                </Text>
            )}
        </>
    );
}

QAAuthTestToolRows.displayName = 'QAAuthTestToolRows';

export default QAAuthTestToolRows;
