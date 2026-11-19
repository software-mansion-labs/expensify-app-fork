/**
 * The registries that map every command of the mock backend to its handler.
 */
import type {WriteCommandParams} from '@pages/SimplifiedBankOnboarding/mockBackend/commands';
import type {CommandHandler} from '@pages/SimplifiedBankOnboarding/mockBackend/types';

import nonUSDWriteHandlers from './nonUSDWriteHandlers';
import readHandlers from './readHandlers';
import usdWriteHandlers from './usdWriteHandlers';

type WriteHandlers = {[TCommand in keyof WriteCommandParams]: CommandHandler<WriteCommandParams[TCommand]>};

const writeHandlers: WriteHandlers = {...usdWriteHandlers, ...nonUSDWriteHandlers};

export {readHandlers, writeHandlers};
