import Switch from '@components/Switch';
import TestToolRow from '@components/TestToolRow';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';

import {getActiveServer} from '@libs/ApiUtils';
import {isQAAuthConfigured} from '@libs/CloudflareAccess/Config';

import {setActiveServer} from '@userActions/User';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

function QAAuthTestToolRows() {
    const {translate} = useLocalize();

    const [activeServer = getActiveServer()] = useOnyx(ONYXKEYS.ACTIVE_SERVER);
    const isUsingQAServer = activeServer === CONST.SERVER.QA;

    if (!isQAAuthConfigured()) {
        return null;
    }

    return (
        /* Toggling either way signs you out: QA is a separate database, so the same email is a different account there. */
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
    );
}

QAAuthTestToolRows.displayName = 'QAAuthTestToolRows';

export default QAAuthTestToolRows;
