import {getActiveServer} from '@libs/ApiUtils';

import {signOutAndRedirectToSignIn} from '@userActions/Session';
import {setActiveServer} from '@userActions/User';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import Onyx from 'react-native-onyx';

jest.mock('@libs/ApiUtils', () => ({
    ...jest.requireActual<Record<string, unknown>>('@libs/ApiUtils'),
    getActiveServer: jest.fn(),
}));

jest.mock('@userActions/Session', () => ({
    signOutAndRedirectToSignIn: jest.fn(),
}));

describe('setActiveServer', () => {
    beforeAll(() => Onyx.init({keys: ONYXKEYS}));

    beforeEach(async () => {
        jest.clearAllMocks();
        await Onyx.clear();
    });

    it.each([
        [CONST.SERVER.PRODUCTION, CONST.SERVER.QA],
        [CONST.SERVER.QA, CONST.SERVER.PRODUCTION],
        [CONST.SERVER.STAGING, CONST.SERVER.QA],
    ])('signs out when the switch crosses the QA boundary (%s -> %s)', (from, to) => {
        // Given the app is on one side of the QA boundary. QA is a separate database, so a session from one side
        // is not valid on the other
        jest.mocked(getActiveServer).mockReturnValue(from);

        // When the tester switches to a server on the other side
        setActiveServer(to);

        // Then the session ends, and the sign-out request is pinned to the server being left, since that is the
        // only server that knows the token
        expect(signOutAndRedirectToSignIn).toHaveBeenCalledWith(undefined, undefined, undefined, undefined, undefined, from);
    });

    it.each([
        [CONST.SERVER.PRODUCTION, CONST.SERVER.STAGING],
        [CONST.SERVER.STAGING, CONST.SERVER.PRODUCTION],
        [CONST.SERVER.QA, CONST.SERVER.QA],
    ])('keeps the session when the switch stays on one side (%s -> %s)', (from, to) => {
        // Given the app is on a server on the same side of the QA boundary as the target
        jest.mocked(getActiveServer).mockReturnValue(from);

        // When the tester switches without crossing the QA boundary
        setActiveServer(to);

        // Then the user stays signed in, because only a QA crossing ends the session
        expect(signOutAndRedirectToSignIn).not.toHaveBeenCalled();
    });

    it('stores the new server either way', async () => {
        // Given a switch that also signs the user out
        jest.mocked(getActiveServer).mockReturnValue(CONST.SERVER.PRODUCTION);

        // When the tester picks QA
        setActiveServer(CONST.SERVER.QA);

        // Then the choice still reaches Onyx, so the sign-in screen that follows talks to QA
        await new Promise<void>((resolve) => {
            const connection = Onyx.connect({
                key: ONYXKEYS.ACTIVE_SERVER,
                callback: (value) => {
                    if (value !== CONST.SERVER.QA) {
                        return;
                    }
                    Onyx.disconnect(connection);
                    resolve();
                },
            });
        });
    });
});
