/**
 * QA auth is web-only, so neither of these can run. They exist to keep `HttpUtils` — which every platform
 * imports — from reaching the session module and dragging the authorize/PKCE/token chain into the native
 * bundles.
 */
import type {HandleQAUnauthorized, PrepareQARequestAuth} from './types';

const prepareQARequestAuth: PrepareQARequestAuth = () => Promise.resolve(undefined);

const handleQAUnauthorized: HandleQAUnauthorized = () => Promise.reject(new Error('QA auth is web-only: a native request never carries a QA bearer'));

export {handleQAUnauthorized, prepareQARequestAuth};
