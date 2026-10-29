import Button from '@components/Button';
import Tooltip from '@components/Tooltip';

import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import useLocalize from '@hooks/useLocalize';
import usePopoverPosition from '@hooks/usePopoverPosition';
import useThemeStyles from '@hooks/useThemeStyles';

import CreateMenuPopover from '@pages/inbox/sidebar/FABPopoverContent/CreateMenuPopover';
import useCreateMenuVisibility from '@pages/inbox/sidebar/FABPopoverContent/useCreateMenuVisibility';

import CONST from '@src/CONST';
import type {AnchorPosition} from '@src/styles';
import type AnchorAlignment from '@src/types/utils/AnchorAlignment';

import React, {useRef, useState} from 'react';
import {View} from 'react-native';

const CREATE_MENU_ANCHOR_ALIGNMENT: AnchorAlignment = {
    horizontal: CONST.MODAL.ANCHOR_ORIGIN_HORIZONTAL.LEFT,
    vertical: CONST.MODAL.ANCHOR_ORIGIN_VERTICAL.TOP,
};

type FlatNavCreateButtonProps = {
    /** Shows only a round "+" instead of the labelled button, for a collapsed bar */
    isCompact?: boolean;
};

/** The flat navigation bar's Create button, which opens the same create menu as the floating action button, right below itself. */
function FlatNavCreateButton({isCompact = false}: FlatNavCreateButtonProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();
    const icons = useMemoizedLazyExpensifyIcons(['Plus']);
    const {calculatePopoverPosition} = usePopoverPosition();
    const {isCreateMenuActive, isCreateMenuVisible, hideCreateMenu, toggleCreateMenu} = useCreateMenuVisibility();
    const buttonRef = useRef<View>(null);
    const [anchorPosition, setAnchorPosition] = useState<AnchorPosition>();

    const measureAnchorPosition = () =>
        calculatePopoverPosition(buttonRef, CREATE_MENU_ANCHOR_ALIGNMENT).then(({horizontal, vertical}) => {
            setAnchorPosition({horizontal, vertical});
        });

    const button = (
        <Button
            ref={buttonRef}
            testID="FlatNavCreateButton"
            accessibilityLabel={translate('common.create')}
            accessibilityHasPopup="menu"
            accessibilityState={{expanded: isCreateMenuActive}}
            variant={CONST.BUTTON_VARIANT.SUCCESS}
            size={CONST.BUTTON_SIZE.SMALL}
            style={!isCompact && styles.w100}
            innerStyles={[styles.flatNavigationBarCreateButton, isCompact && styles.flatNavigationBarCreateButtonCompact]}
            onPress={() => toggleCreateMenu(measureAnchorPosition)}
            sentryLabel={CONST.SENTRY_LABEL.NAVIGATION_TAB_BAR.FLOATING_ACTION_BUTTON}
        >
            <Button.Icon src={icons.Plus} />
            {!isCompact && <Button.Text>{translate('common.create')}</Button.Text>}
        </Button>
    );

    return (
        <>
            <CreateMenuPopover
                isVisible={isCreateMenuVisible}
                onClose={hideCreateMenu}
                anchorRef={buttonRef}
                anchorPosition={anchorPosition}
                anchorAlignment={CREATE_MENU_ANCHOR_ALIGNMENT}
            />
            {isCompact ? (
                <Tooltip text={translate('common.create')}>
                    <View style={styles.alignSelfStart}>{button}</View>
                </Tooltip>
            ) : (
                button
            )}
        </>
    );
}

export default FlatNavCreateButton;
