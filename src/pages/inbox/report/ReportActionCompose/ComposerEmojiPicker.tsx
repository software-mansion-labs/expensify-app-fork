import EmojiPickerButton from '@components/EmojiPicker/EmojiPickerButton';

import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useScreenActivityEffect from '@hooks/useScreenActivityEffect';
import useThemeStyles from '@hooks/useThemeStyles';

import {canUseTouchScreen} from '@libs/DeviceCapabilities';
import DomUtils from '@libs/DomUtils';

import {hideEmojiPicker, isActive as isActiveEmojiPickerAction} from '@userActions/EmojiPickerAction';

import CONST from '@src/CONST';

import React from 'react';

import {useComposerMeta, useComposerSendState, useComposerState} from './ComposerContext';

function ComposerEmojiPicker() {
    const {reportID} = useComposerState();
    const styles = useThemeStyles();

    const {isMediumScreenWidth} = useResponsiveLayout();
    const {composerRef} = useComposerMeta();
    const {isBlockedFromConcierge} = useComposerSendState();

    const chatItemComposeSecondaryRowHeight = styles.chatItemComposeSecondaryRow.height + styles.chatItemComposeSecondaryRow.marginTop + styles.chatItemComposeSecondaryRow.marginBottom;
    const reportActionComposeHeight = styles.chatItemComposeBox.minHeight + chatItemComposeSecondaryRowHeight;
    const emojiOffsetWithComposeBox = (styles.chatItemComposeBox.minHeight - styles.chatItemEmojiButton.height) / 2;
    const emojiShiftVertical = reportActionComposeHeight - emojiOffsetWithComposeBox - CONST.MENU_POSITION_REPORT_ACTION_COMPOSE_BOTTOM;

    // The picker is anchored to this composer, so only the composer going away or the report changing closes it. A cover
    // keeps the composer and its anchor in place, and the screen on top uses the same global picker.
    useScreenActivityEffect(
        () => () => {
            if (!isActiveEmojiPickerAction(reportID)) {
                return;
            }
            hideEmojiPicker();
        },
        [reportID],
    );

    if (canUseTouchScreen() && isMediumScreenWidth) {
        return null;
    }

    return (
        <EmojiPickerButton
            isDisabled={isBlockedFromConcierge}
            onModalHide={(isNavigating) => {
                if (isNavigating) {
                    return;
                }
                const activeElementId = DomUtils.getActiveElement()?.id;
                if (activeElementId === CONST.COMPOSER.NATIVE_ID || activeElementId === CONST.EMOJI_PICKER_BUTTON_NATIVE_ID) {
                    return;
                }
                composerRef.current?.focus(true);
            }}
            onEmojiSelected={(...args) => composerRef.current?.replaceSelectionWithText(...args)}
            emojiPickerID={reportID}
            shiftVertical={emojiShiftVertical}
        />
    );
}

export default ComposerEmojiPicker;
