import {isFullScreenName, isSidebarScreenName} from '@libs/Navigation/helpers/isNavigatorName';

type ScreenEntry = string | {path?: string; screens?: Record<string, ScreenEntry>};

type RouteNode = {
    name: string;
    path: string;
    isFullScreen: boolean;
    isSidebar: boolean;
    children: RouteNode[];
};

function buildTree(screens: Record<string, ScreenEntry>): RouteNode[] {
    return Object.entries(screens).map(([name, entry]) => {
        const path = typeof entry === 'string' ? entry : (entry?.path ?? '');
        const nested = typeof entry === 'object' ? entry?.screens : undefined;
        return {
            name,
            path,
            isFullScreen: isFullScreenName(name),
            isSidebar: isSidebarScreenName(name),
            children: nested ? buildTree(nested) : [],
        };
    });
}

export type {RouteNode, ScreenEntry};
export {buildTree};
