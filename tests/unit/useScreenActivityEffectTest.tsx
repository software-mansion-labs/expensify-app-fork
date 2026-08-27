import {render} from '@testing-library/react-native';

import useScreenActivityEffect from '@hooks/useScreenActivityEffect';
import {ScreenActivityModeProvider} from '@hooks/useScreenActivityEffect/ScreenActivityModeContext';

import StrictModeMountGate from '@libs/Navigation/PlatformStackNavigation/createPlatformStackNavigatorComponent/ScreenActivityWrapper/StrictModeMountGate';

import type {ReactNode} from 'react';

import React, {Activity} from 'react';

// The gate picks its implementation at module load, so the flag has to be mocked before the import above runs.
jest.mock('@src/CONFIG', () => ({__esModule: true, default: {USE_ACTIVITY_SCREEN_STRICT_MODE_IN_DEV: true}}));

const log: string[] = [];

function Subject({value}: {value: string}) {
    useScreenActivityEffect(() => {
        log.push(`setup:${value}`);
        return () => {
            log.push(`cleanup:${value}`);
        };
    }, [value]);
    return null;
}

function Screen({mode, value = 'a', hasSubject = true, isWrapped = true}: {mode: 'visible' | 'hidden'; value?: string; hasSubject?: boolean; isWrapped?: boolean}) {
    const subject = hasSubject ? <Subject value={value} /> : null;
    if (!isWrapped) {
        return subject;
    }
    return (
        <ScreenActivityModeProvider isHidden={mode === 'hidden'}>
            <Activity mode={mode}>{subject}</Activity>
        </ScreenActivityModeProvider>
    );
}

function Strict({children}: {children: ReactNode}) {
    return <StrictModeMountGate>{children}</StrictModeMountGate>;
}

describe('useScreenActivityEffect', () => {
    beforeEach(() => {
        log.length = 0;
    });

    it('runs the cleanup when the dependencies change', () => {
        const {rerender} = render(
            <Screen
                mode="visible"
                value="a"
            />,
        );
        log.length = 0;
        rerender(
            <Screen
                mode="visible"
                value="b"
            />,
        );
        expect(log).toEqual(['cleanup:a', 'setup:b']);
    });

    it('runs the cleanup when the Activity hides the screen', () => {
        const {rerender} = render(<Screen mode="visible" />);
        log.length = 0;
        rerender(<Screen mode="hidden" />);
        expect(log).toEqual(['cleanup:a']);
    });

    it('runs the setup again when the Activity reveals the screen', () => {
        const {rerender} = render(<Screen mode="visible" />);
        rerender(<Screen mode="hidden" />);
        log.length = 0;
        rerender(<Screen mode="visible" />);
        expect(log).toEqual(['setup:a']);
    });

    it('does not run the cleanup when the whole screen unmounts while visible', () => {
        const {unmount} = render(<Screen mode="visible" />);
        log.length = 0;
        unmount();
        expect(log).toEqual([]);
    });

    it('does not run the cleanup when only the component unmounts while the screen stays alive', () => {
        const {rerender} = render(<Screen mode="visible" />);
        log.length = 0;
        rerender(
            <Screen
                mode="visible"
                hasSubject={false}
            />,
        );
        expect(log).toEqual([]);
    });

    it('does not run the cleanup twice when the screen unmounts while hidden', () => {
        const {rerender, unmount} = render(<Screen mode="visible" />);
        rerender(<Screen mode="hidden" />);
        log.length = 0;
        unmount();
        expect(log).toEqual([]);
    });

    it('is plain useEffect with no Activity above it', () => {
        const {unmount} = render(
            <Screen
                mode="visible"
                isWrapped={false}
            />,
        );
        log.length = 0;
        unmount();
        expect(log).toEqual(['cleanup:a']);
    });

    it('still runs the cleanup for the StrictMode remount cycle', () => {
        render(
            <Strict>
                <Screen mode="visible" />
            </Strict>,
        );
        expect(log).toEqual(['setup:a', 'cleanup:a', 'setup:a']);
    });

    it('runs the cleanup on a dependency change under StrictMode', () => {
        const {rerender} = render(
            <Strict>
                <Screen
                    mode="visible"
                    value="a"
                />
            </Strict>,
        );
        log.length = 0;
        rerender(
            <Strict>
                <Screen
                    mode="visible"
                    value="b"
                />
            </Strict>,
        );
        expect(log).toEqual(['cleanup:a', 'setup:b']);
    });
});
