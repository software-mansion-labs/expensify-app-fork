import {act, fireEvent, render, screen} from '@testing-library/react-native';

import SelectionList from '@components/SelectionList';
import TestToolMenu from '@components/TestToolMenu';

import Navigation from '@libs/Navigation/Navigation';
import navigationRef from '@libs/Navigation/navigationRef';

import ServerSelector from '@pages/settings/Troubleshoot/ServerSelector';

import toggleTestToolsModal from '@userActions/TestTool';
import {setActiveServer} from '@userActions/User';

import CONST from '@src/CONST';
import NAVIGATORS from '@src/NAVIGATORS';
import ONYXKEYS from '@src/ONYXKEYS';
import ROUTES from '@src/ROUTES';
import SCREENS from '@src/SCREENS';

import type {ValueOf} from 'type-fest';

import React from 'react';

import createMock from '../utils/createMock';

let mockActiveServer: ValueOf<typeof CONST.SERVER> = CONST.SERVER.PRODUCTION;

// jest.mock factories cannot close over non-`mock`-prefixed module scope
const mockActiveServerKey = ONYXKEYS.ACTIVE_SERVER;

jest.mock('@hooks/useOnyx', () => ({
    __esModule: true,
    default: (key: string) => [key === mockActiveServerKey ? mockActiveServer : undefined, {status: 'loaded'}],
}));

jest.mock('@hooks/useIsAuthenticated', () => ({
    __esModule: true,
    default: () => false,
}));

jest.mock('@hooks/useLocalize', () => ({
    __esModule: true,
    default: () => ({translate: (key: string) => key}),
}));

jest.mock('@src/CONFIG', () => ({
    __esModule: true,
    default: {...jest.requireActual<{default: object}>('@src/CONFIG').default, IS_USING_LOCAL_WEB: false},
}));

jest.mock('@components/SelectionList', () => jest.fn(() => null));
jest.mock('@components/HeaderWithBackButton', () => () => null);
jest.mock('@libs/Navigation/Navigation', () => ({
    __esModule: true,
    default: {navigate: jest.fn(), goBack: jest.fn(), getActiveRoute: jest.fn(() => '/test-tools')},
}));
jest.mock('@libs/Navigation/navigationRef', () => ({
    __esModule: true,
    default: {current: {getRootState: jest.fn()}},
}));
jest.mock('@userActions/User', () => ({
    setActiveServer: jest.fn(),
    setIsDebugModeEnabled: jest.fn(),
    setShouldShowBranchNameInTitle: jest.fn(),
}));

const getSelectionListProps = () => {
    const props = jest.mocked(SelectionList).mock.calls.at(-1)?.at(0);
    if (!props) {
        throw new Error('SelectionList was never rendered');
    }
    return props;
};

const getConfirmButtonOptions = () => {
    const confirmButtonOptions = getSelectionListProps().confirmButtonOptions;
    if (!confirmButtonOptions) {
        throw new Error('SelectionList was rendered without a confirm button');
    }
    return confirmButtonOptions;
};

const pressSave = () => {
    const {onConfirm} = getConfirmButtonOptions();
    if (!onConfirm) {
        throw new Error('The confirm button was rendered without an onConfirm');
    }
    onConfirm();
};

type RootState = ReturnType<NonNullable<typeof navigationRef.current>['getRootState']>;

const mockTestToolsModalState = (backTo?: string) => {
    jest.mocked(navigationRef.current?.getRootState)?.mockReturnValue(
        createMock<RootState>({
            routes: [
                {
                    name: NAVIGATORS.TEST_TOOLS_MODAL_NAVIGATOR,
                    state: {routes: [{name: SCREENS.TEST_TOOLS_MODAL.ROOT, params: backTo ? {backTo} : undefined}]},
                },
            ],
        }),
    );
};

describe('Server selection', () => {
    beforeEach(() => {
        mockActiveServer = CONST.SERVER.PRODUCTION;
        jest.clearAllMocks();
    });

    describe('the server row in the test tools', () => {
        it('shows the active server and opens the route it was given', () => {
            mockActiveServer = CONST.SERVER.STAGING;
            render(<TestToolMenu serverPageRoute={ROUTES.TEST_TOOLS_SERVER} />);

            expect(screen.getByText('initialSettingsPage.troubleshoot.servers.staging.label')).toBeOnTheScreen();

            fireEvent.press(screen.getByLabelText('initialSettingsPage.troubleshoot.server'));
            expect(Navigation.navigate).toHaveBeenCalledWith(ROUTES.TEST_TOOLS_SERVER);
        });

        it('no longer renders a staging toggle, so the server is only changed from the page', () => {
            render(<TestToolMenu serverPageRoute={ROUTES.SETTINGS_TROUBLESHOOT_SERVER} />);

            expect(screen.getByLabelText('initialSettingsPage.troubleshoot.server')).toBeOnTheScreen();
            expect(screen.queryByText('initialSettingsPage.troubleshoot.useStagingServer')).not.toBeOnTheScreen();
        });
    });

    describe('the server selector', () => {
        it('offers production and staging, with the active one selected', () => {
            mockActiveServer = CONST.SERVER.STAGING;
            render(<ServerSelector />);

            const {data} = getSelectionListProps();
            expect(data.map((item) => item.keyForList)).toEqual([CONST.SERVER.PRODUCTION, CONST.SERVER.STAGING]);
            expect(data.find((item) => item.isSelected)?.keyForList).toBe(CONST.SERVER.STAGING);
        });

        it('keeps Save disabled until a different server is picked', () => {
            render(<ServerSelector />);
            expect(getConfirmButtonOptions().isDisabled).toBe(true);

            act(() => getSelectionListProps().onSelectRow({keyForList: CONST.SERVER.STAGING}));

            expect(getConfirmButtonOptions().isDisabled).toBe(false);
        });

        it('stores the picked server on Save', () => {
            render(<ServerSelector />);
            act(() => getSelectionListProps().onSelectRow({keyForList: CONST.SERVER.STAGING}));
            pressSave();

            expect(setActiveServer).toHaveBeenCalledWith(CONST.SERVER.STAGING);
        });
    });

    describe('dismissing the test tools modal', () => {
        // toggleTestToolsModal is throttled at module scope, so each toggle needs the window advanced past
        beforeEach(() => jest.useFakeTimers());
        afterEach(() => jest.useRealTimers());

        it('goes back to where the modal was opened from, and to the root when it was opened without a backTo', () => {
            mockTestToolsModalState(ROUTES.SETTINGS_TROUBLESHOOT);
            toggleTestToolsModal();
            expect(Navigation.goBack).toHaveBeenCalledWith(ROUTES.SETTINGS_TROUBLESHOOT);

            jest.advanceTimersByTime(CONST.TIMING.TEST_TOOLS_MODAL_THROTTLE_TIME);

            mockTestToolsModalState();
            toggleTestToolsModal();
            expect(Navigation.goBack).toHaveBeenLastCalledWith(ROUTES.ROOT);
        });
    });
});
