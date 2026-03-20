import React from 'react';
import {useMemoizedLazyExpensifyIcons} from '@hooks/useLazyAsset';
import Navigation from '@libs/Navigation/Navigation';
import FABFocusableMenuItem from '@pages/inbox/sidebar/FABPopoverContent/FABFocusableMenuItem';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';

const ITEM_ID = CONST.FAB_MENU_ITEM_IDS.EXPERTISE;

function ExpertiseMenuItem() {
    const icons = useMemoizedLazyExpensifyIcons(['Star'] as const);

    return (
        <FABFocusableMenuItem
            itemId={ITEM_ID}
            isVisible
            icon={icons.Star}
            title="Centrum ekspertyzy"
            onPress={() => Navigation.navigate(ROUTES.EXPERTISE_FULLSCREEN)}
        />
    );
}

export default ExpertiseMenuItem;
