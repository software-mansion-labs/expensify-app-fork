import React from 'react';
import {PickerStateProvider} from 'react-native-picker-select';
import CONST from '@src/CONST';
import {useSplashScreenState} from '@src/SplashScreenStateContext';
import type ChildrenProps from '@src/types/utils/ChildrenProps';
import ComposeProviders from './ComposeProviders';
import FullScreenBlockingViewContextProvider from './FullScreenBlockingViewContextProvider';
import FullScreenLoaderContextProvider from './FullScreenLoaderContext';
import {ModalProvider} from './Modal/Global/ModalContext';
import {OnyxListItemProviderDeferred} from './OnyxListItemProvider';
import PopoverContextProvider from './PopoverProvider';
import SidePanelContextProvider from './SidePanel/SidePanelContextProvider';
import {EditingCellProvider} from './Table/EditableCell';

const deferredProviders = [
    PopoverContextProvider,
    PickerStateProvider,
    FullScreenBlockingViewContextProvider,
    FullScreenLoaderContextProvider,
    ModalProvider,
    SidePanelContextProvider,
    EditingCellProvider,
    OnyxListItemProviderDeferred,
];

function PostSplashProviders({children}: ChildrenProps) {
    const {splashScreenState} = useSplashScreenState();
    const shouldMountDeferredProviders = splashScreenState === CONST.BOOT_SPLASH_STATE.HIDDEN;

    if (!shouldMountDeferredProviders) {
        return children;
    }

    return <ComposeProviders components={deferredProviders}>{children}</ComposeProviders>;
}

PostSplashProviders.displayName = 'PostSplashProviders';

export default PostSplashProviders;
