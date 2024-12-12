const iosSourceDir = process.env.PROJECT_ROOT_PATH ? process.env.PROJECT_ROOT_PATH + 'ios' : 'ios';
const androidSourceDir = process.env.PROJECT_ROOT_PATH ? process.env.PROJECT_ROOT_PATH + 'android' : 'android';
const path = require('path');
const pak = require('./modules/ContactsNitroModule/package.json');

module.exports = {
    project: {
        ios: {sourceDir: iosSourceDir},
        android: {sourceDir: androidSourceDir},
    },
    assets: ['./assets/fonts/native'],
    dependencies: {
        [pak.name]: {
            root: path.join(__dirname, 'modules', 'ContactsNitroModule'),
        },
    },
};
