import {NativeModules} from 'react-native';

const {ShareActionHandlerModule} = NativeModules;

type ShareActionHandlerType = {
    processFiles(callback: (file: string) => void): void;
};

export default ShareActionHandlerModule as ShareActionHandlerType;
