/**
 * Carries no page chrome of its own: it renders both in a full-height settings screen and in the
 * fixed-height test tools card, so each host supplies the wrapper.
 */
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import SelectionList from '@components/SelectionList';
import SingleSelectListItem from '@components/SelectionList/ListItem/SingleSelectListItem';
import type {ListItem} from '@components/SelectionList/ListItem/types';

import useLocalize from '@hooks/useLocalize';
import useOnyx from '@hooks/useOnyx';

import {getActiveServer} from '@libs/ApiUtils';
import Navigation from '@libs/Navigation/Navigation';

import {setActiveServer} from '@userActions/User';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import type {ValueOf} from 'type-fest';

import React, {useState} from 'react';

type Server = ValueOf<typeof CONST.SERVER>;

const SELECTABLE_SERVERS = [CONST.SERVER.PRODUCTION, CONST.SERVER.STAGING] as const;

type ServerSelectorProps = {
    /** Pads for the device safe area. The test tools modal floats, so it must not. */
    shouldAddBottomSafeAreaPadding?: boolean;
};

function ServerSelector({shouldAddBottomSafeAreaPadding = false}: ServerSelectorProps) {
    const {translate} = useLocalize();
    const [activeServer = getActiveServer()] = useOnyx(ONYXKEYS.ACTIVE_SERVER);

    const [selectedServer, setSelectedServer] = useState<Server>(activeServer);

    const servers: ListItem[] = SELECTABLE_SERVERS.map((server) => ({
        text: translate(`initialSettingsPage.troubleshoot.servers.${server}.label`),
        alternateText: translate(`initialSettingsPage.troubleshoot.servers.${server}.description`),
        keyForList: server,
        isSelected: selectedServer === server,
    }));

    const confirmButtonOptions = {
        showButton: true,
        text: translate('common.save'),
        onConfirm: () => setActiveServer(selectedServer),
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
                onSelectRow={(server: ListItem) => setSelectedServer(server.keyForList as Server)}
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
