import React from 'react';
import ConfirmModal from './components/ConfirmModal';
import EmojiPicker from './components/EmojiPicker/EmojiPicker';
import GrowlNotification from './components/GrowlNotification';
import UpdateAppModal from './components/UpdateAppModal';
import useLocalize from './hooks/useLocalize';
import * as EmojiPickerAction from './libs/actions/EmojiPickerAction';
import * as User from './libs/actions/User';
import {growlRef} from './libs/Growl';
import './libs/Notification/PushNotification/subscribeToPushNotifications';
import PopoverReportActionContextMenu from './pages/home/report/ContextMenu/PopoverReportActionContextMenu';
import * as ReportActionContextMenu from './pages/home/report/ContextMenu/ReportActionContextMenu';

function ExtraContent({updateAvailable, updateRequired, screenShareRequest}) {
    const {translate} = useLocalize();

    console.log('show ExtraContent');

    return (
        <>
            <GrowlNotification ref={growlRef} />
            <PopoverReportActionContextMenu ref={ReportActionContextMenu.contextMenuRef} />
            <EmojiPicker ref={EmojiPickerAction.emojiPickerRef} />
            {/* We include the modal for showing a new update at the top level so the option is always present. */}
            {updateAvailable && !updateRequired ? <UpdateAppModal /> : null}
            {screenShareRequest ? (
                <ConfirmModal
                    title={translate('guides.screenShare')}
                    onConfirm={() => User.joinScreenShare(screenShareRequest.accessToken, screenShareRequest.roomName)}
                    onCancel={User.clearScreenShareRequest}
                    prompt={translate('guides.screenShareRequest')}
                    confirmText={translate('common.join')}
                    cancelText={translate('common.decline')}
                    isVisible
                />
            ) : null}
        </>
    );
}

ExtraContent.displayName = 'ExtraContent';

export default ExtraContent;
