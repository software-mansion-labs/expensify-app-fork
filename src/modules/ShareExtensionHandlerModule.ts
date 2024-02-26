import {NativeModules} from 'react-native';

const {ShareExtensionHandlerModule} = NativeModules;

type ShareExtensionHandlerType = {
    processFiles(callback: (array: string[]) => void): void;
};

export default ShareExtensionHandlerModule as ShareExtensionHandlerType;
