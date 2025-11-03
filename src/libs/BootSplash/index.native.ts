import {InteractionManager, NativeModules} from 'react-native';

const BootSplash = NativeModules.BootSplash;

function hide(): Promise<void> {
    console.log('[BootSplash] hiding splash screen');

    return BootSplash.hide().finally(() => {
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        InteractionManager.runAfterInteractions(() => {
            console.log('[BootSplash] splash screen hidden');
        });
    });
}

export default {
    hide,
    logoSizeRatio: BootSplash?.logoSizeRatio || 1,
    navigationBarHeight: BootSplash?.navigationBarHeight || 0,
};