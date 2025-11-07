import type {ComponentProps, ComponentType} from 'react';
import React, {Suspense} from 'react';
import lazyRetry from '@src/utils/lazyRetry';

type Import<T> = Promise<{default: T}>;
type ComponentImport<T> = () => Import<T>;

/**
 * Wraps React.lazy with Suspense and retry logic
 * Automatically adds a Suspense boundary with FullScreenLoadingIndicator as fallback
 *
 * @param componentImport - A function that returns a promise resolving to a lazily imported React component
 * @returns A component wrapped with Suspense and retry logic
 *
 * @example
 * const MyPage = lazyWithSuspense(() => import('@pages/MyPage'));
 *
 * // Then use it in your navigator
 * <Stack.Screen name="MY_PAGE" component={MyPage} />
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyWithSuspense<T extends ComponentType<any>>(componentImport: ComponentImport<T>): ComponentType<React.ComponentProps<T>> {
    const LazyComponent = React.lazy(() => lazyRetry(componentImport));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function WithSuspense(props: ComponentProps<T>) {
        return (
            <Suspense fallback={null}>
                {/* eslint-disable-next-line react/jsx-props-no-spreading */}
                <LazyComponent {...props} />
            </Suspense>
        );
    }

    WithSuspense.displayName = 'LazyWithSuspense';

    return WithSuspense;
}

export default lazyWithSuspense;
