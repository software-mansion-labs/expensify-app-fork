/**
 * Carries no page chrome of its own: it renders both in a full-height settings screen and in the
 * fixed-height test tools card, so each host supplies the wrapper.
 */
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import {ModalActions} from '@components/Modal/Global/ModalContext';
import SelectionList from '@components/SelectionList';
import SingleSelectListItem from '@components/SelectionList/ListItem/SingleSelectListItem';
import type {ListItem} from '@components/SelectionList/ListItem/types';

import useConfirmModal from '@hooks/useConfirmModal';
import useIsAuthenticated from '@hooks/useIsAuthenticated';
import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';

import {getActiveServer} from '@libs/ApiUtils';
import {isQAAuthConfigured} from '@libs/CloudflareAccess/Config';
import Navigation from '@libs/Navigation/Navigation';

import {setActiveServer} from '@userActions/User';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import type {ValueOf} from 'type-fest';

import React, {useState} from 'react';

type Server = ValueOf<typeof CONST.SERVER>;

/** Narrows keyForList so onSelectRow hands back a server rather than a bare string */
type ServerListItem = ListItem & {keyForList: Server};

type ServerSelectorProps = {
    /** Pads for the device safe area. The test tools modal floats, so it must not. */
    shouldAddBottomSafeAreaPadding?: boolean;
};

function ServerSelector({shouldAddBottomSafeAreaPadding = false}: ServerSelectorProps) {
    const {translate} = useLocalize();
    const {showConfirmModal} = useConfirmModal();
    const isAuthenticated = useIsAuthenticated();
    const [activeServer = getActiveServer()] = useOnyx(ONYXKEYS.ACTIVE_SERVER);

    const [selectedServer, setSelectedServer] = useState<Server>(activeServer);

    const selectableServers = isQAAuthConfigured() ? [CONST.SERVER.PRODUCTION, CONST.SERVER.STAGING, CONST.SERVER.QA] : [CONST.SERVER.PRODUCTION, CONST.SERVER.STAGING];

    const servers: ServerListItem[] = selectableServers.map((server) => ({
        text: translate(`initialSettingsPage.troubleshoot.servers.${server}.label`),
        alternateText: translate(`initialSettingsPage.troubleshoot.servers.${server}.description`),
        keyForList: server,
        isSelected: selectedServer === server,
    }));

    // QA is a separate database, so the same email is a different account there and setActiveServer ends the
    // session on either crossing. There is no session to lose on the sign-in screen.
    const shouldConfirmSignOut = isAuthenticated && selectedServer !== activeServer && (selectedServer === CONST.SERVER.QA || activeServer === CONST.SERVER.QA);

    const applyServerChange = async () => {
        if (shouldConfirmSignOut) {
            const result = await showConfirmModal({
                title: translate('common.areYouSure'),
                prompt: translate('initialSettingsPage.troubleshoot.confirmServerChangeDescription'),
                confirmText: translate('initialSettingsPage.signOut'),
                cancelText: translate('common.cancel'),
                shouldShowCancelButton: true,
            });
            if (result.action !== ModalActions.CONFIRM) {
                return;
            }
        }
        setActiveServer(selectedServer);
    };

    const confirmButtonOptions = {
        showButton: true,
        text: translate('common.save'),
        onConfirm: () => {
            applyServerChange();
        },
        isDisabled: selectedServer === activeServer,
    };

    return (
        <>
            <HeaderWithBackButton
                title={translate('initialSettingsPage.troubleshoot.server')}
                onBackButtonPress={() => Navigation.goBack()}
            />
            <SelectionList
                data={servers}
                ListItem={SingleSelectListItem}
                onSelectRow={(server: ServerListItem) => setSelectedServer(server.keyForList)}
                shouldSingleExecuteRowSelect
                confirmButtonOptions={confirmButtonOptions}
                initiallyFocusedItemKey={activeServer}
                addBottomSafeAreaPadding={shouldAddBottomSafeAreaPadding}
            />
        </>
    );
}

ServerSelector.displayName = 'ServerSelector';

export default ServerSelector;
