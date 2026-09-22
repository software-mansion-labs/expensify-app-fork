import {getOAuthRedirectURI, isQAAuthConfigured} from '@libs/CloudflareAccess/Config';

import CONST from '@src/CONST';

import {Platform} from 'react-native';

jest.mock('@src/CONFIG', () => ({
    __esModule: true,
    default: {
        QA_AUTH: {
            API_ROOT: 'https://qa.example.com/',
            SECURE_API_ROOT: 'https://qa-secure.example.com/',
            TEAM_DOMAIN: 'team.cloudflareaccess.com',
            CLIENT_ID: 'client-web',
            NATIVE_CLIENT_ID: 'client-native',
        },
    },
}));

function setPlatform(os: string, version: string | number) {
    Object.defineProperty(Platform, 'OS', {value: os, configurable: true});
    Object.defineProperty(Platform, 'Version', {value: version, configurable: true});
}

describe('native CloudflareAccess Config', () => {
    const originalOS = Platform.OS;
    const originalVersion = Platform.Version;

    afterEach(() => {
        setPlatform(originalOS, originalVersion);
    });

    it('returns the staging app-link callback as the redirect URI', () => {
        // Given the staging host serves the claim files for the native-only callback path
        // When the redirect URI is read
        const redirectURI = getOAuthRedirectURI();

        // Then it points at staging and the native path, regardless of the configured QA origin
        expect(redirectURI).toBe(`${CONST.STAGING_NEW_EXPENSIFY_URL}${CONST.CLOUDFLARE_ACCESS.NATIVE_OAUTH_CALLBACK_PATH}`);
        expect(redirectURI).toBe('https://staging.new.expensify.com/oauth/native-callback');
    });

    it.each([
        ['ios', '17.4', true],
        ['ios', '17.10', true],
        ['ios', '18.0', true],
        ['ios', '17.3', false],
        ['ios', '16.7.1', false],
        ['android', 34, true],
    ])('on %s %s reports configured=%s', (os, version, expected) => {
        // Given a device running the platform and version under test
        setPlatform(os, version);

        // When the configuration gate is evaluated
        // Then only iOS below 17.4 is rejected, because claimed https callbacks need 17.4
        expect(isQAAuthConfigured()).toBe(expected);
    });
});
