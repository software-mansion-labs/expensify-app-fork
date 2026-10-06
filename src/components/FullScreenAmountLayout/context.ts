import createContextNamespace from '@hooks/createContextNamespace';

import type {FullScreenAmountLayoutContextValue} from './types';

const [FullScreenAmountLayoutContext, useFullScreenAmountLayoutContext] = createContextNamespace('FullScreenAmountLayout')<FullScreenAmountLayoutContextValue>();

function useFullScreenAmountLayout() {
    return useFullScreenAmountLayoutContext('useFullScreenAmountLayout');
}

export {FullScreenAmountLayoutContext, useFullScreenAmountLayout};
