import {render} from '@testing-library/react-native';

import useScreenActivityEffect from '@hooks/useScreenActivityEffect';
import {ScreenActivityEffectBoundaryProvider} from '@hooks/useScreenActivityEffect/ScreenActivityEffectBoundaryContext';

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

type ScreenProps = {
    mode: 'visible' | 'hidden';
    value?: string;
    hasSubject?: boolean;
    isWrapped?: boolean;
    isStrict?: boolean;
};

function Screen({mode, value = 'a', hasSubject = true, isWrapped = true, isStrict = false}: ScreenProps) {
    const subject = hasSubject ? <Subject value={value} /> : null;
    const content = isStrict ? <StrictModeMountGate>{subject}</StrictModeMountGate> : subject;
    if (!isWrapped) {
        return content;
    }
    return (
        <ScreenActivityEffectBoundaryProvider>
            <Activity mode={mode}>{content}</Activity>
        </ScreenActivityEffectBoundaryProvider>
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

    it('does not run the cleanup when the Activity hides the screen', () => {
        const {rerender} = render(<Screen mode="visible" />);
        log.length = 0;
        rerender(<Screen mode="hidden" />);
        expect(log).toEqual([]);
    });

    it('leaves the live setup alone when the Activity reveals the screen', () => {
        const {rerender} = render(<Screen mode="visible" />);
        rerender(<Screen mode="hidden" />);
        log.length = 0;
        rerender(<Screen mode="visible" />);
        expect(log).toEqual([]);
    });

    it('runs a dependency change that landed while the screen was hidden on the reveal', () => {
        const {rerender} = render(
            <Screen
                mode="visible"
                value="a"
            />,
        );
        rerender(
            <Screen
                mode="hidden"
                value="a"
            />,
        );
        log.length = 0;
        rerender(
            <Screen
                mode="hidden"
                value="b"
            />,
        );
        rerender(
            <Screen
                mode="visible"
                value="b"
            />,
        );
        expect(log).toEqual(['cleanup:a', 'setup:b']);
    });

    it('runs the cleanup when the screen unmounts while visible', () => {
        const {unmount} = render(<Screen mode="visible" />);
        log.length = 0;
        unmount();
        expect(log).toEqual(['cleanup:a']);
    });

    it('runs the cleanup when the screen unmounts while hidden', () => {
        const {rerender, unmount} = render(<Screen mode="visible" />);
        rerender(<Screen mode="hidden" />);
        log.length = 0;
        unmount();
        expect(log).toEqual(['cleanup:a']);
    });

    it('holds the cleanup of a component that unmounted back until the screen unmounts', () => {
        const {rerender, unmount} = render(<Screen mode="visible" />);
        log.length = 0;
        rerender(
            <Screen
                mode="visible"
                hasSubject={false}
            />,
        );
        expect(log).toEqual([]);
        unmount();
        expect(log).toEqual(['cleanup:a']);
    });

    it('runs the cleanup once when the screen unmounts after a dependency change', () => {
        const {rerender, unmount} = render(
            <Screen
                mode="visible"
                value="a"
            />,
        );
        rerender(
            <Screen
                mode="visible"
                value="b"
            />,
        );
        log.length = 0;
        unmount();
        expect(log).toEqual(['cleanup:b']);
    });

    it('is plain useEffect with no boundary above it', () => {
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

    it('survives the StrictMode remount cycle that runs below the boundary', () => {
        render(
            <Screen
                mode="visible"
                isStrict
            />,
        );
        expect(log).toEqual(['setup:a']);
    });

    it('sets up again when the StrictMode remount cycle takes the boundary with it', () => {
        render(
            <Strict>
                <Screen mode="visible" />
            </Strict>,
        );
        expect(log).toEqual(['setup:a', 'cleanup:a', 'setup:a']);
    });

    it('runs the cleanup on a dependency change under StrictMode', () => {
        const {rerender} = render(
            <Screen
                mode="visible"
                value="a"
                isStrict
            />,
        );
        log.length = 0;
        rerender(
            <Screen
                mode="visible"
                value="b"
                isStrict
            />,
        );
        expect(log).toEqual(['cleanup:a', 'setup:b']);
    });
});
