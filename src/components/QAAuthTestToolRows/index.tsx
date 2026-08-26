import Button from '@components/ButtonComposed';
import Switch from '@components/Switch';
import TestToolRow from '@components/TestToolRow';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';

import {getActiveServer} from '@libs/ApiUtils';
import {getCloudflareTeamLogoutURL, isQAAuthConfigured} from '@libs/CloudflareAccess/Config';
import Log from '@libs/Log';

import {clearCloudflareSession} from '@userActions/CloudflareSession';
import {openExternalLink} from '@userActions/Link';
import {signOutAndRedirectToSignIn} from '@userActions/Session';
import {setActiveServer} from '@userActions/User';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import {useState} from 'react';

function QAAuthTestToolRows() {
    const {translate} = useLocalize();

    const [activeServer = getActiveServer()] = useOnyx(ONYXKEYS.ACTIVE_SERVER);
    const isUsingQAServer = activeServer === CONST.SERVER.QA;

    const [isSigningOut, setIsSigningOut] = useState(false);

    if (!isQAAuthConfigured()) {
        return null;
    }

    return (
        <>
            {/* Toggling either way signs you out: QA is a separate database, so the same email is a different account there. */}
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
            {/* Cloudflare's identity is a cookie on its own domain, so only a navigation there can drop it, and
                that page is a dead end — hence a new tab, leaving this one to land on the sign-in screen. Our
                own tokens have to go too, or an unexpired one lets the next handshake be skipped entirely. */}
            <TestToolRow title={translate('initialSettingsPage.troubleshoot.qaAuthCloudflareIdentity')}>
                <Button
                    size={CONST.BUTTON_SIZE.SMALL}
                    isDisabled={isSigningOut}
                    onPress={() => {
                        setIsSigningOut(true);
                        // Opened first: window.open outside the click's own task is blocked as a popup
                        openExternalLink(getCloudflareTeamLogoutURL());
                        // The LogOut has to finish before the tokens go: sent without one it 401s where nothing reports it
                        Promise.resolve(signOutAndRedirectToSignIn())
                            .then(() => clearCloudflareSession())
                            .catch((error: unknown) => Log.warn('QA Cloudflare sign-out did not complete', {error}))
                            .finally(() => setIsSigningOut(false));
                    }}
                >
                    <Button.Text>{translate('initialSettingsPage.troubleshoot.qaAuthCloudflareSignOut')}</Button.Text>
                </Button>
            </TestToolRow>
        </>
    );
}

QAAuthTestToolRows.displayName = 'QAAuthTestToolRows';

export default QAAuthTestToolRows;
