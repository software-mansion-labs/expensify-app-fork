import {renderHook} from '@testing-library/react-native';
import navigateToWorkspacesPage from '@libs/Navigation/helpers/navigateToWorkspacesPage';
import NAVIGATORS from '@src/NAVIGATORS';
import SCREENS from '@src/SCREENS';
import createRandomPolicy from '../../utils/collections/policies';

jest.mock('@libs/Navigation/AppNavigator/createSplitNavigator/usePreserveNavigatorState', () => ({
    getPreservedNavigatorState: jest.fn(() => undefined),
}));

jest.mock('@libs/Navigation/helpers/lastVisitedTabPathUtils', () => ({
    getWorkspacesTabStateFromSessionStorage: jest.fn(() => undefined),
}));

const mockResponsiveLayout = jest.fn(() => ({shouldUseNarrowLayout: false}));
jest.mock('@hooks/useResponsiveLayout', () => () => mockResponsiveLayout());

jest.mock('@hooks/useCurrentUserPersonalDetails', () => () => ({login: 'test@example.com'}));

const mockRootState = jest.fn((): unknown => undefined);
jest.mock('@hooks/useRootNavigationState', () => (selector: (state: unknown) => unknown) => selector(mockRootState()));

const mockUseOnyx = jest.fn().mockReturnValue([undefined]);
jest.mock('@hooks/useOnyx', () => (key: unknown, opts?: unknown) => mockUseOnyx(key, opts) as unknown[]);

jest.mock('@libs/Navigation/helpers/navigateToWorkspacesPage', () => ({
    __esModule: true,
    default: jest.fn(),
}));

const fakePolicyID = 'ABCD1234';
const mockPolicy = {...createRandomPolicy(0), id: fakePolicyID};
// eslint-disable-next-line @typescript-eslint/unbound-method
const mockedNavigateToWorkspacesPage = jest.mocked(navigateToWorkspacesPage);

const useRestoreWorkspacesTabOnNavigate = (require('@hooks/useRestoreWorkspacesTabOnNavigate') as {default: () => () => void}).default;

const lastVisitedTabPathUtils = require('@libs/Navigation/helpers/lastVisitedTabPathUtils') as {getWorkspacesTabStateFromSessionStorage: jest.Mock};

function setupOnyxForPolicy() {
    mockUseOnyx.mockImplementation((_key: unknown, opts?: {selector?: (data: unknown) => unknown}) => {
        if (opts?.selector) {
            return [opts.selector({[`policy_${fakePolicyID}`]: mockPolicy})];
        }
        return [undefined];
    });
}

function buildStateWithUserOnDifferentTab(workspaceRoutes: unknown[]) {
    return {
        routes: [
            {
                name: NAVIGATORS.TAB_NAVIGATOR,
                state: {
                    index: 0,
                    routes: [
                        {name: NAVIGATORS.REPORTS_SPLIT_NAVIGATOR},
                        {
                            name: NAVIGATORS.WORKSPACE_NAVIGATOR,
                            state: {routes: workspaceRoutes},
                        },
                    ],
                },
            },
        ],
    };
}

describe('useRestoreWorkspacesTabOnNavigate', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockUseOnyx.mockReturnValue([undefined]);
        mockResponsiveLayout.mockReturnValue({shouldUseNarrowLayout: false});
        lastVisitedTabPathUtils.getWorkspacesTabStateFromSessionStorage.mockReturnValue(undefined);
    });

    it('passes the last visited workspace route and matching policy to navigateToWorkspacesPage', () => {
        setupOnyxForPolicy();
        const workspaceSplitRoute = {
            name: NAVIGATORS.WORKSPACE_SPLIT_NAVIGATOR,
            state: {routes: [{name: SCREENS.WORKSPACE.INITIAL, params: {policyID: fakePolicyID}}]},
        };
        mockRootState.mockReturnValue(buildStateWithUserOnDifferentTab([workspaceSplitRoute]));

        const {result} = renderHook(() => useRestoreWorkspacesTabOnNavigate());
        result.current();

        expect(mockedNavigateToWorkspacesPage).toHaveBeenCalledWith(
            expect.objectContaining({
                lastWorkspacesTabNavigatorRoute: workspaceSplitRoute,
                policy: mockPolicy,
                shouldUseNarrowLayout: false,
                currentUserLogin: 'test@example.com',
            }),
        );
    });

    it('passes undefined lastWorkspacesTabNavigatorRoute when no workspace was previously visited', () => {
        mockRootState.mockReturnValue({
            routes: [
                {
                    name: NAVIGATORS.TAB_NAVIGATOR,
                    state: {index: 0, routes: [{name: NAVIGATORS.REPORTS_SPLIT_NAVIGATOR}]},
                },
            ],
        });

        const {result} = renderHook(() => useRestoreWorkspacesTabOnNavigate());
        result.current();

        expect(mockedNavigateToWorkspacesPage).toHaveBeenCalledWith(
            expect.objectContaining({
                lastWorkspacesTabNavigatorRoute: undefined,
                policy: undefined,
            }),
        );
    });

    // Regression: clicking the Workspaces tab from any other tab should land the user on the *exact* sub-page
    // they had open inside the workspace (e.g. Workflows), not the workspace's initial page. The hook must
    // forward the deeper workspace split route to navigateToWorkspacesPage.
    it('forwards the workspace split route with a focused sub-page (Workflows) on a wide layout', () => {
        setupOnyxForPolicy();
        const workspaceSplitRoute = {
            name: NAVIGATORS.WORKSPACE_SPLIT_NAVIGATOR,
            state: {
                index: 1,
                routes: [
                    {name: SCREENS.WORKSPACE.INITIAL, params: {policyID: fakePolicyID}},
                    {name: SCREENS.WORKSPACE.WORKFLOWS, params: {policyID: fakePolicyID}},
                ],
            },
        };
        mockRootState.mockReturnValue(buildStateWithUserOnDifferentTab([workspaceSplitRoute]));

        const {result} = renderHook(() => useRestoreWorkspacesTabOnNavigate());
        result.current();

        expect(mockedNavigateToWorkspacesPage).toHaveBeenCalledWith(expect.objectContaining({lastWorkspacesTabNavigatorRoute: workspaceSplitRoute}));
    });

    // Regression for the original bug (#89106): when an RHP-driven navigation pushes a fresh TabNavigator above
    // the modal, the new TabNavigator's WORKSPACE_NAVIGATOR is empty. The hook must reach into the *older*
    // TabNavigator instance still alive in the root stack to recover the user's last workspace sub-page.
    it('reads workspace state from an older TabNavigator instance when the topmost one is empty', () => {
        setupOnyxForPolicy();
        const workspaceSplitRoute = {
            name: NAVIGATORS.WORKSPACE_SPLIT_NAVIGATOR,
            state: {
                index: 1,
                routes: [
                    {name: SCREENS.WORKSPACE.INITIAL, params: {policyID: fakePolicyID}},
                    {name: SCREENS.WORKSPACE.WORKFLOWS, params: {policyID: fakePolicyID}},
                ],
            },
        };
        mockRootState.mockReturnValue({
            routes: [
                // Older TabNavigator: still holds the workspace state with WORKFLOWS focused.
                {
                    name: NAVIGATORS.TAB_NAVIGATOR,
                    state: {
                        index: 1,
                        routes: [
                            {name: NAVIGATORS.REPORTS_SPLIT_NAVIGATOR},
                            {
                                name: NAVIGATORS.WORKSPACE_NAVIGATOR,
                                state: {routes: [workspaceSplitRoute]},
                            },
                        ],
                    },
                },
                // Newer TabNavigator pushed above the modal: WORKSPACE_NAVIGATOR is empty.
                {
                    name: NAVIGATORS.TAB_NAVIGATOR,
                    state: {
                        index: 0,
                        routes: [{name: NAVIGATORS.REPORTS_SPLIT_NAVIGATOR}, {name: NAVIGATORS.WORKSPACE_NAVIGATOR}],
                    },
                },
            ],
        });

        const {result} = renderHook(() => useRestoreWorkspacesTabOnNavigate());
        result.current();

        expect(mockedNavigateToWorkspacesPage).toHaveBeenCalledWith(expect.objectContaining({lastWorkspacesTabNavigatorRoute: workspaceSplitRoute}));
    });

    it('forwards shouldUseNarrowLayout: true on narrow layouts', () => {
        mockResponsiveLayout.mockReturnValue({shouldUseNarrowLayout: true});
        setupOnyxForPolicy();
        const workspaceSplitRoute = {
            name: NAVIGATORS.WORKSPACE_SPLIT_NAVIGATOR,
            state: {
                index: 1,
                routes: [
                    {name: SCREENS.WORKSPACE.INITIAL, params: {policyID: fakePolicyID}},
                    {name: SCREENS.WORKSPACE.WORKFLOWS, params: {policyID: fakePolicyID}},
                ],
            },
        };
        mockRootState.mockReturnValue(buildStateWithUserOnDifferentTab([workspaceSplitRoute]));

        const {result} = renderHook(() => useRestoreWorkspacesTabOnNavigate());
        result.current();

        expect(mockedNavigateToWorkspacesPage).toHaveBeenCalledWith(
            expect.objectContaining({
                shouldUseNarrowLayout: true,
                lastWorkspacesTabNavigatorRoute: workspaceSplitRoute,
            }),
        );
    });

    // Cold-start path: when no workspace route exists anywhere in the live nav tree, fall back to the
    // sessionStorage-persisted state so a fresh page-load still restores the user's last workspace sub-page.
    it('hydrates from sessionStorage when the live navigation tree has no workspace route', () => {
        setupOnyxForPolicy();
        const workspaceSplitRoute = {
            name: NAVIGATORS.WORKSPACE_SPLIT_NAVIGATOR,
            state: {
                index: 1,
                routes: [
                    {name: SCREENS.WORKSPACE.INITIAL, params: {policyID: fakePolicyID}},
                    {name: SCREENS.WORKSPACE.WORKFLOWS, params: {policyID: fakePolicyID}},
                ],
            },
        };
        mockRootState.mockReturnValue({
            routes: [
                {
                    name: NAVIGATORS.TAB_NAVIGATOR,
                    state: {index: 0, routes: [{name: NAVIGATORS.REPORTS_SPLIT_NAVIGATOR}]},
                },
            ],
        });
        lastVisitedTabPathUtils.getWorkspacesTabStateFromSessionStorage.mockReturnValue({
            routes: [
                {
                    name: NAVIGATORS.WORKSPACE_NAVIGATOR,
                    state: {routes: [workspaceSplitRoute]},
                },
            ],
        });

        const {result} = renderHook(() => useRestoreWorkspacesTabOnNavigate());
        result.current();

        expect(mockedNavigateToWorkspacesPage).toHaveBeenCalledWith(expect.objectContaining({lastWorkspacesTabNavigatorRoute: workspaceSplitRoute}));
    });
});
