import {useEffect} from 'react';
import BootSplash from '@libs/BootSplash';
import type {SplashScreenHiderProps, SplashScreenHiderReturnType} from './types';

function SplashScreenHider({onHide = () => {}}: SplashScreenHiderProps): SplashScreenHiderReturnType {
    useEffect(() => {
        BootSplash.hide().then(() => {
            // Measure duration since app-start
            const duration = performance.now() - performance.getEntriesByName('app-start')[0].startTime;
            console.log(`[App Load Timer] Splash hidden after ${Math.round(duration)} ms`);

            onHide();
        });
    }, [onHide]);

    return null;
}

SplashScreenHider.displayName = 'SplashScreenHider';

export default SplashScreenHider;
