import React, {createContext, useEffect, useMemo, useRef, useState} from 'react';
import type {ReactNode} from 'react';
import {Linking} from 'react-native';
import {signInAfterTransitionFromOldDot} from '@libs/actions/Session';
import CONST from '@src/CONST';
import type {Route} from '@src/ROUTES';
import {useSplashScreenStateContext} from '@src/SplashScreenStateContext';

type InitialUrlContextType = {
    initialURL: Route | undefined;
    setInitialURL: React.Dispatch<React.SetStateAction<Route | undefined>>;
};

/** Initial url that will be opened when NewDot is embedded into Hybrid App. */
const InitialURLContext = createContext<InitialUrlContextType>({
    initialURL: undefined,
    setInitialURL: () => {},
});

type InitialURLContextProviderProps = {
    url?: Route;

    hybridAppSettings?: string;

    /** Children passed to the context provider */
    children: ReactNode;
};

function InitialURLContextProvider({children, url, hybridAppSettings}: InitialURLContextProviderProps) {
    const [initialURL, setInitialURL] = useState<Route | undefined>(url);
    const {setSplashScreenState} = useSplashScreenStateContext();

    const firstRenderRef = useRef(true);

    useEffect(() => {
        if (url && hybridAppSettings && firstRenderRef.current) {
            signInAfterTransitionFromOldDot(url, hybridAppSettings).then((route) => {
                setInitialURL(route);
                setSplashScreenState(CONST.BOOT_SPLASH_STATE.READY_TO_BE_HIDDEN);
            });
            firstRenderRef.current = false;
            return;
        }
        Linking.getInitialURL().then((initURL) => {
            setInitialURL(initURL as Route);
        });
    }, [hybridAppSettings, setSplashScreenState, url]);

    useEffect(() => {
        console.debug('VALUE OF firstRenderRef', {firstRenderRef: firstRenderRef.current});
    });

    const initialUrlContext = useMemo(
        () => ({
            initialURL,
            setInitialURL,
        }),
        [initialURL],
    );

    return <InitialURLContext.Provider value={initialUrlContext}>{children}</InitialURLContext.Provider>;
}

InitialURLContextProvider.displayName = 'InitialURLContextProvider';

export default InitialURLContextProvider;
export {InitialURLContext};
