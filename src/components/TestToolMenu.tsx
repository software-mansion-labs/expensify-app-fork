import useIsAuthenticated from '@hooks/useIsAuthenticated';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';
import {useSidebarOrderedReportsActions} from '@hooks/useSidebarOrderedReports';
import useThemeStyles from '@hooks/useThemeStyles';

import {isUsingStagingApi} from '@libs/ApiUtils';
import {isQAAuthConfigured} from '@libs/CloudflareOAuth/config';
import {useIsAgentAccount} from '@libs/SessionUtils';

import type {QAProbeResult, QAProbeStatus} from '@userActions/CloudflareProbe';
import {runQAProbe} from '@userActions/CloudflareProbe';
import {clearCfSession, prepareQAAuthFlow} from '@userActions/CloudflareSession';
import {setShouldFailAllRequests, setShouldForceOffline, setShouldSimulatePoorConnection} from '@userActions/Network';
import {expireSessionWithDelay, invalidateAuthToken, invalidateCredentials} from '@userActions/Session';
import {setIsDebugModeEnabled, setShouldShowBranchNameInTitle, setShouldUseStagingServer} from '@userActions/User';

import CONFIG from '@src/CONFIG';
import ONYXKEYS from '@src/ONYXKEYS';

import {useEffect, useState} from 'react';
import {Platform} from 'react-native';

import BiometricsTestToolRow from './BiometricsTestToolRow';
import Button from './Button';
import SoftKillTestToolRow from './SoftKillTestToolRow';
import Switch from './Switch';
import TestCrash from './TestCrash';
import TestToolRow from './TestToolRow';
import Text from './Text';

/** The four semantic probe outcomes are translated; the raw `detail` diagnostic stays verbatim */
const QA_PROBE_STATUS_TRANSLATION_KEYS = {
    success: 'qaAuthStatusSuccess',
    cancelled: 'qaAuthStatusCancelled',
    reauthRequired: 'qaAuthStatusReauthRequired',
    error: 'qaAuthStatusError',
} as const satisfies Record<QAProbeStatus, string>;

function TestToolMenu() {
    const [network] = useOnyx(ONYXKEYS.NETWORK);
    const [isUsingImportedState] = useOnyx(ONYXKEYS.IS_USING_IMPORTED_STATE);
    const [shouldUseStagingServer = isUsingStagingApi()] = useOnyx(ONYXKEYS.SHOULD_USE_STAGING_SERVER);
    const [isDebugModeEnabled = false] = useOnyx(ONYXKEYS.IS_DEBUG_MODE_ENABLED);
    const [shouldShowBranchNameInTitle = false] = useOnyx(ONYXKEYS.SHOULD_SHOW_BRANCH_NAME_IN_TITLE);
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {clearLHNCache} = useSidebarOrderedReportsActions();

    // Check if the user is authenticated to show options that require authentication
    const isAuthenticated = useIsAuthenticated();

    // Agent accounts can't have biometric multifactor authentication, so hide the biometrics test row for them.
    const isAgentAccount = useIsAgentAccount();

    // QA auth POC (see Web_POC.md): Run stays disabled until the session cache is hydrated and a PKCE
    // pair is pre-warmed, so the press path reaches the popup with zero awaits (user activation intact).
    const [isQAAuthReady, setIsQAAuthReady] = useState(false);
    const [isQAOperationRunning, setIsQAOperationRunning] = useState(false);
    const [qaProbeResult, setQAProbeResult] = useState<QAProbeResult | null>(null);
    // Rendered next to the result: consecutive probes usually produce byte-identical results, and
    // without a changing element the button reads as dead ("does nothing visual" — live POC feedback)
    const [qaProbeCompletedAt, setQAProbeCompletedAt] = useState<Date | null>(null);

    useEffect(() => {
        // The platform gate is load-bearing: on native, prepareQAAuthFlow would hit the throwing crypto stub
        if (Platform.OS !== 'web' || !isQAAuthConfigured()) {
            return;
        }
        prepareQAAuthFlow()
            .then(() => setIsQAAuthReady(true))
            // Surface preparation failures — otherwise Run just sits disabled forever with no explanation
            .catch((error: unknown) => setQAProbeResult({status: 'error', detail: error instanceof Error ? error.message : undefined}));
    }, []);

    return (
        <>
            <Text
                style={[styles.textLabelSupporting, styles.mb4]}
                numberOfLines={1}
            >
                {translate('initialSettingsPage.troubleshoot.testingPreferences')}
            </Text>
            {isAuthenticated && (
                <>
                    {/* When toggled the app will be put into debug mode. */}
                    <TestToolRow
                        title={translate('initialSettingsPage.troubleshoot.debugMode')}
                        isTitleAccessible={false}
                    >
                        <Switch
                            accessibilityLabel={translate('initialSettingsPage.troubleshoot.debugMode')}
                            isOn={isDebugModeEnabled}
                            onToggle={() => setIsDebugModeEnabled(!isDebugModeEnabled)}
                        />
                    </TestToolRow>

                    {/* When toggled on web, the current git branch name is prepended to the browser tab title. */}
                    {Platform.OS === 'web' && !!__GIT_BRANCH__ && (
                        <TestToolRow title={translate('initialSettingsPage.troubleshoot.showBranchNameInTitle')}>
                            <Switch
                                accessibilityLabel={translate('initialSettingsPage.troubleshoot.showBranchNameInTitle')}
                                isOn={shouldShowBranchNameInTitle}
                                onToggle={() => setShouldShowBranchNameInTitle(!shouldShowBranchNameInTitle)}
                            />
                        </TestToolRow>
                    )}

                    {/* Instantly invalidates a user's local authToken. Useful for testing flows related to reauthentication. */}
                    <TestToolRow title={translate('initialSettingsPage.troubleshoot.authenticationStatus')}>
                        <Button
                            small
                            text={translate('initialSettingsPage.troubleshoot.invalidate')}
                            onPress={() => invalidateAuthToken()}
                        />
                    </TestToolRow>

                    {/* Invalidate stored user auto-generated credentials. Useful for manually testing sign out logic. */}
                    <TestToolRow title={translate('initialSettingsPage.troubleshoot.deviceCredentials')}>
                        <Button
                            small
                            text={translate('initialSettingsPage.troubleshoot.destroy')}
                            onPress={() => invalidateCredentials()}
                        />
                    </TestToolRow>

                    {/* Sends an expired session to the FE and invalidates the session by the same time in the BE. Action is delayed for 15s */}
                    <TestToolRow title={translate('initialSettingsPage.troubleshoot.authenticationStatus')}>
                        <Button
                            small
                            text={translate('initialSettingsPage.troubleshoot.invalidateWithDelay')}
                            onPress={() => expireSessionWithDelay()}
                        />
                    </TestToolRow>

                    {/* Clears the useSidebarOrderedReports cache to re-compute from latest onyx values */}
                    <TestToolRow title={translate('initialSettingsPage.troubleshoot.leftHandNavCache')}>
                        <Button
                            small
                            text={translate('initialSettingsPage.troubleshoot.clearleftHandNavCache')}
                            onPress={clearLHNCache}
                        />
                    </TestToolRow>

                    {/* Allows testing and revoking biometric multifactor authentication */}
                    {!isAgentAccount && <BiometricsTestToolRow />}
                </>
            )}

            {/* Option to switch between staging and default api endpoints.
        This enables QA, internal testers and external devs to take advantage of sandbox environments for 3rd party services like Plaid and Onfido.
        This toggle is not rendered for internal devs as they make environment changes directly to the .env file. */}
            {!CONFIG.IS_USING_LOCAL_WEB && (
                <TestToolRow
                    title={translate('initialSettingsPage.troubleshoot.useStagingServer')}
                    isTitleAccessible={false}
                >
                    <Switch
                        accessibilityLabel="Use Staging Server"
                        isOn={shouldUseStagingServer}
                        onToggle={() => setShouldUseStagingServer(!shouldUseStagingServer)}
                    />
                </TestToolRow>
            )}

            {/* POC: Cloudflare Access OAuth against the QA mock Worker — see Web_POC.md. The shared busy
            flag serializes Run and Clear; Run additionally waits for pre-warm readiness, while Clear
            deliberately doesn't — clearing needs neither hydration nor a PKCE pair, and a failed
            pre-warm must not lock the user out of clearing. */}
            {Platform.OS === 'web' && isQAAuthConfigured() && (
                <>
                    <TestToolRow title={translate('initialSettingsPage.troubleshoot.qaAuth')}>
                        <Button
                            small
                            text={translate('initialSettingsPage.troubleshoot.qaAuthRunProbe')}
                            isDisabled={!isQAAuthReady || isQAOperationRunning}
                            isLoading={isQAOperationRunning}
                            onPress={() => {
                                setIsQAOperationRunning(true);
                                // runQAProbe never rejects — every failure comes back as a semantic result
                                runQAProbe()
                                    .then((result) => {
                                        setQAProbeResult(result);
                                        setQAProbeCompletedAt(new Date());
                                    })
                                    .finally(() => setIsQAOperationRunning(false));
                            }}
                        />
                    </TestToolRow>
                    <TestToolRow title={translate('initialSettingsPage.troubleshoot.qaAuthSession')}>
                        <Button
                            small
                            text={translate('initialSettingsPage.troubleshoot.qaAuthClearSession')}
                            isDisabled={isQAOperationRunning}
                            onPress={() => {
                                setIsQAOperationRunning(true);
                                clearCfSession()
                                    .then(() => {
                                        setQAProbeResult(null);
                                        setQAProbeCompletedAt(null);
                                    })
                                    .catch((error: unknown) => {
                                        setQAProbeResult({status: 'error', detail: error instanceof Error ? error.message : undefined});
                                        setQAProbeCompletedAt(new Date());
                                    })
                                    .finally(() => setIsQAOperationRunning(false));
                            }}
                        />
                    </TestToolRow>
                    {!!qaProbeResult && (
                        <Text style={styles.textLabelSupporting}>
                            {translate(`initialSettingsPage.troubleshoot.${QA_PROBE_STATUS_TRANSLATION_KEYS[qaProbeResult.status]}`)}
                            {qaProbeResult.detail ? ` (${qaProbeResult.detail})` : ''}
                            {qaProbeCompletedAt ? ` — ${qaProbeCompletedAt.toLocaleTimeString()}` : ''}
                        </Text>
                    )}
                </>
            )}

            {/* When toggled the app will be forced offline. */}
            <TestToolRow
                title={translate('initialSettingsPage.troubleshoot.forceOffline')}
                isTitleAccessible={false}
            >
                <Switch
                    accessibilityLabel="Force offline"
                    isOn={!!network?.shouldForceOffline}
                    onToggle={() => setShouldForceOffline(!network?.shouldForceOffline)}
                    disabled={!!isUsingImportedState || !!network?.shouldSimulatePoorConnection || network?.shouldFailAllRequests}
                />
            </TestToolRow>

            {/* When toggled the app will randomly change internet connection every 2-5 seconds */}
            <TestToolRow
                title={translate('initialSettingsPage.troubleshoot.simulatePoorConnection')}
                isTitleAccessible={false}
            >
                <Switch
                    accessibilityLabel="Simulate poor internet connection"
                    isOn={!!network?.shouldSimulatePoorConnection}
                    onToggle={() => setShouldSimulatePoorConnection(!network?.shouldSimulatePoorConnection)}
                    disabled={!!isUsingImportedState || !!network?.shouldFailAllRequests || network?.shouldForceOffline}
                />
            </TestToolRow>

            {/* When toggled all network requests will fail. */}
            <TestToolRow
                title={translate('initialSettingsPage.troubleshoot.simulateFailingNetworkRequests')}
                isTitleAccessible={false}
            >
                <Switch
                    accessibilityLabel="Simulate failing network requests"
                    isOn={!!network?.shouldFailAllRequests}
                    onToggle={() => setShouldFailAllRequests(!network?.shouldFailAllRequests)}
                    disabled={!!network?.shouldForceOffline || network?.shouldSimulatePoorConnection}
                />
            </TestToolRow>
            <SoftKillTestToolRow />
            <TestCrash />
        </>
    );
}

export default TestToolMenu;
