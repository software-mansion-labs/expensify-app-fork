/**
 * The control panel of the mock server: how slow it answers, whether it fails, and the server-side facts that change the
 * path through the flow. The real flow has no such panel, it only makes every branch reachable from the UI.
 * It is a development tool, so its text is plain English and is not translated.
 */

import Button from '@components/Button';
import Section from '@components/Section';
import Text from '@components/Text';

import useOnyx from '@hooks/useOnyx';
import useThemeStyles from '@hooks/useThemeStyles';

import SBO_CONST from '@pages/SimplifiedBankOnboarding/contract/SBO_CONST';
import {resetLabData} from '@pages/SimplifiedBankOnboarding/lab/labActions';
import {setUserValidated, updateServerSettings} from '@pages/SimplifiedBankOnboarding/mockBackend/serverEvents';
import ToggleSettingOptionRow from '@pages/workspace/workflows/ToggleSettingsOptionRow';

import {setShouldForceOffline} from '@userActions/Network';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {Network} from '@src/types/onyx';

import type {OnyxEntry} from 'react-native-onyx';

import React from 'react';

import OptionButtons from './OptionButtons';
import RequestLog from './RequestLog';

const {FAILURE_MODE, LATENCY_OPTIONS_MS} = SBO_CONST.MOCK;

const LATENCY_OPTIONS = LATENCY_OPTIONS_MS.map((latencyMs) => ({value: latencyMs, label: `${latencyMs} ms`}));

const FAILURE_MODE_OPTIONS = [
    {value: FAILURE_MODE.NONE, label: 'Never'},
    {value: FAILURE_MODE.NEXT_WRITE, label: 'Next write'},
    {value: FAILURE_MODE.ALL_REQUESTS, label: 'Every request'},
];

const shouldForceOfflineSelector = (network: OnyxEntry<Network>) => !!network?.shouldForceOffline;

const SWITCH_SENTRY_LABEL = CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.CHANGE_MOCK_SERVER;

function MockServerPanel() {
    const styles = useThemeStyles();
    const [mockServer] = useOnyx(ONYXKEYS.SIMPLIFIED_BANK_ONBOARDING_MOCK_SERVER);
    const [shouldForceOffline = false] = useOnyx(ONYXKEYS.NETWORK, {selector: shouldForceOfflineSelector});

    const settings = mockServer?.settings;

    return (
        <Section
            title="Mock backend"
            subtitle="These settings live on the mock server. They decide which branch of the flow you walk through."
            subtitleMuted
            isCentralPane
        >
            <OptionButtons
                title="Response time"
                options={LATENCY_OPTIONS}
                selectedValue={settings?.latencyMs}
                onSelect={(latencyMs) => updateServerSettings({latencyMs})}
            />
            <OptionButtons
                title="Fail requests"
                options={FAILURE_MODE_OPTIONS}
                selectedValue={settings?.failureMode}
                onSelect={(failureMode) => updateServerSettings({failureMode})}
            />
            <ToggleSettingOptionRow
                wrapperStyle={styles.mt5}
                title="The user is validated"
                subtitle={`When off, the entry page sends the user to the verify-account page first. The code is ${SBO_CONST.MOCK.VALID_VALIDATE_CODE}.`}
                switchAccessibilityLabel="The user is validated"
                switchSentryLabel={SWITCH_SENTRY_LABEL}
                isActive={!!mockServer?.user.validated}
                onToggle={setUserValidated}
            />
            <ToggleSettingOptionRow
                wrapperStyle={styles.mt5}
                title="Ask for KYB documents"
                subtitle="The USD flow gets an extra step with file uploads after the agreements."
                switchAccessibilityLabel="Ask for KYB documents"
                switchSentryLabel={SWITCH_SENTRY_LABEL}
                isActive={!!settings?.shouldRequireKYBDocuments}
                onToggle={(shouldRequireKYBDocuments) => updateServerSettings({shouldRequireKYBDocuments})}
            />
            <ToggleSettingOptionRow
                wrapperStyle={styles.mt5}
                title="Throttle the account"
                subtitle="The entry page shows a blocking error instead of the flow."
                switchAccessibilityLabel="Throttle the account"
                switchSentryLabel={SWITCH_SENTRY_LABEL}
                isActive={!!settings?.isThrottled}
                onToggle={(isThrottled) => updateServerSettings({isThrottled})}
            />
            <ToggleSettingOptionRow
                wrapperStyle={styles.mt5}
                title="Force offline"
                subtitle="This is the offline switch of the whole app. Writes wait in a queue, reads are dropped."
                switchAccessibilityLabel="Force offline"
                switchSentryLabel={SWITCH_SENTRY_LABEL}
                isActive={shouldForceOffline}
                onToggle={setShouldForceOffline}
            />
            <Button
                style={styles.mt5}
                variant={CONST.BUTTON_VARIANT.DANGER}
                onPress={resetLabData}
                sentryLabel={CONST.SENTRY_LABEL.BANK_ONBOARDING_LAB.CHANGE_MOCK_SERVER}
            >
                <Button.Text>Reset the server and the client data</Button.Text>
            </Button>
            <Text style={[styles.textStrong, styles.mt5]}>Request log</Text>
            <RequestLog entries={mockServer?.requestLog ?? []} />
        </Section>
    );
}

export default MockServerPanel;
