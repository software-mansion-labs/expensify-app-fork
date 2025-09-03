import {NitroModules} from 'react-native-nitro-modules';
import type {ContactsModule} from './ContactsModule.nitro';
import type {NavBarManagerModule} from './NavBarManagerModule.nitro';

const ContactsNitroModule = NitroModules.createHybridObject<ContactsModule>('ContactsModule');
const NavBarManagerNitroModule = NitroModules.createHybridObject<NavBarManagerModule>('NavBarManagerModule');

export { ContactsNitroModule, NavBarManagerNitroModule };
export * from './ContactsModule.nitro';
