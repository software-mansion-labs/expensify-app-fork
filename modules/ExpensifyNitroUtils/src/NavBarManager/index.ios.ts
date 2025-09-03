import type {NavBarManagerType} from './types';
import {NAVIGATION_BAR_TYPE} from './types';

const NavBarManager: NavBarManagerType = {
    setButtonStyle: () => {},
    getType: () => (NAVIGATION_BAR_TYPE.GESTURE_BAR),
};

export {NavBarManager};
export * from './types';
