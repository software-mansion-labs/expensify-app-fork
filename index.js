/**
 * @format
 */
// import of polyfills should always be first
import './src/polyfills/PromiseWithResolvers';
import {AppRegistry} from 'react-native';
import App from './src/App';
import Config from './src/CONFIG';
import additionalAppSetup from './src/setup';
import {LoadSkiaWeb} from '@shopify/react-native-skia/lib/module/web';

// Define EXPO_OS before any imports to prevent console errors from Expo DOM components
if (!process.env.EXPO_OS && __DEV__) {
    const {Platform} = require('react-native');
    const originalEnv = process.env;
    process.env = {
        ...originalEnv,
        EXPO_OS: Platform.OS,
    };
}

// Load Skia before registering the app
LoadSkiaWeb({
    locateFile: (file) => `/${file}`,
}).then(() => {
    AppRegistry.registerComponent(Config.APP_NAME, () => App);
    additionalAppSetup();
});
