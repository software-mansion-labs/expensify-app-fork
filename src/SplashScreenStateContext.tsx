import React, {useContext, useMemo, useState} from 'react';
import CONST from './CONST';

type SplashScreenStateContextType = {
    splashScreenState: string;
    setSplashScreenState: React.Dispatch<React.SetStateAction<string>>;
};

const SplashScreenStateContext = React.createContext<SplashScreenStateContextType>({
    splashScreenState: CONST.BOOT_SPLASH_STATE.VISIBLE,
    setSplashScreenState: () => {},
});

type ChildrenProps = {
    children: React.ReactNode;
};

function SplashScreenStateContextProvider({children}: ChildrenProps) {
    const [splashScreenState, setSplashScreenState] = useState<string>(CONST.BOOT_SPLASH_STATE.VISIBLE);
    const splashScreenStateContext = useMemo(
        () => ({
            splashScreenState,
            setSplashScreenState,
        }),
        [splashScreenState],
    );

    return <SplashScreenStateContext.Provider value={splashScreenStateContext}>{children}</SplashScreenStateContext.Provider>;
}

function useSplashScreenStateContext() {
    return useContext(SplashScreenStateContext);
}

export default SplashScreenStateContext;
export {SplashScreenStateContextProvider, useSplashScreenStateContext};