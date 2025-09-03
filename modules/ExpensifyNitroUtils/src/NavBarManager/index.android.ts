import {NavBarManagerNitroModule} from '../specs';
import type {NavBarManagerType} from './types';

const NavBarManager: NavBarManagerType = {
    setButtonStyle: (style) => {
        NavBarManagerNitroModule.setButtonStyle(style);
    },
    getType: () => {
        return NavBarManagerNitroModule.getType();
    },
};

export {NavBarManager};
export * from './types';
