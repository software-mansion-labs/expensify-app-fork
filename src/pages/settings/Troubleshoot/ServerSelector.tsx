import HeaderWithBackButton from '@components/HeaderWithBackButton';
import {ModalActions} from '@components/Modal/Global/ModalContext';
import SelectionList from '@components/SelectionList';
import SingleSelectListItem from '@components/SelectionList/ListItem/SingleSelectListItem';
import type {ListItem} from '@components/SelectionList/ListItem/types';
import Text from '@components/Text';

import useActiveServer from '@hooks/useActiveServer';
import useConfirmModal from '@hooks/useConfirmModal';
import useIsAuthenticated from '@hooks/useIsAuthenticated';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';

import type {Server} from '@libs/ApiUtils';
import {isQAAuthConfigured} from '@libs/CloudflareAccess/Config';
import Log from '@libs/Log';
import Navigation from '@libs/Navigation/Navigation';

import {setActiveServer} from '@userActions/User';

import CONST from '@src/CONST';

import React, {useState} from 'react';

type ServerListItem = ListItem & {keyForList: Server};

const ALWAYS_SELECTABLE_SERVERS = [CONST.SERVER.PRODUCTION, CONST.SERVER.STAGING] as const;

type ServerSelectorProps = {
    /** The test tools modal floats, so it leaves this off. */
    shouldAddBottomSafeAreaPadding?: boolean;
};

function ServerSelector({shouldAddBottomSafeAreaPadding = false}: ServerSelectorProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const {showConfirmModal} = useConfirmModal();
    const isAuthenticated = useIsAuthenticated();
    const {activeServer, isPinnedByEnvironment} = useActiveServer();

    // The resolved server arrives a tick after mount, so it cannot seed this state
    const [pickedServer, setPickedServer] = useState<Server>();
    const selectedServer = pickedServer ?? activeServer;

    const offeredServers = [...ALWAYS_SELECTABLE_SERVERS, ...(isQAAuthConfigured() ? [CONST.SERVER.QA] : [])];

    // A pinned build can be on a server the list would not otherwise offer
    const listedServers = offeredServers.includes(activeServer) ? offeredServers : [...offeredServers, activeServer];

    const servers: ServerListItem[] = listedServers.map((server) => ({
        text: translate(`initialSettingsPage.troubleshoot.servers.${server}.label`),
        alternateText: translate(`initialSettingsPage.troubleshoot.servers.${server}.description`),
        keyForList: server,
        isSelected: selectedServer === server,
    }));

    const confirmAndApplyServerChange = async () => {
        // QA is a separate database, so the same email is a different account there and setActiveServer ends
        // the session on either crossing.
        const shouldConfirmSignOut = isAuthenticated && selectedServer !== activeServer && (selectedServer === CONST.SERVER.QA || activeServer === CONST.SERVER.QA);

        if (shouldConfirmSignOut) {
            const result = await showConfirmModal({
                title: translate('common.areYouSure'),
                prompt: translate('initialSettingsPage.troubleshoot.confirmServerChangeDescription'),
                confirmText: translate('initialSettingsPage.signOut'),
                cancelText: translate('common.cancel'),
                shouldShowCancelButton: true,
            });
            if (result.action !== ModalActions.CONFIRM) {
                setPickedServer(undefined);
                return;
            }
        }
        setActiveServer(selectedServer);
        Navigation.goBack();
    };

    const confirmButtonOptions = {
        showButton: !isPinnedByEnvironment,
        text: translate('common.save'),
        onConfirm: () => {
            confirmAndApplyServerChange().catch((error: unknown) => {
                Log.warn('Failed to change the active server', {error});
            });
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
                onSelectRow={(server: ServerListItem) => setPickedServer(server.keyForList)}
                shouldSingleExecuteRowSelect
                confirmButtonOptions={confirmButtonOptions}
                isDisabled={isPinnedByEnvironment}
                customListHeaderContent={
                    isPinnedByEnvironment ? <Text style={[styles.mh5, styles.mv3]}>{translate('initialSettingsPage.troubleshoot.serverPinnedDescription')}</Text> : undefined
                }
                initiallyFocusedItemKey={activeServer}
                addBottomSafeAreaPadding={shouldAddBottomSafeAreaPadding}
            />
        </>
    );
}

export default ServerSelector;
