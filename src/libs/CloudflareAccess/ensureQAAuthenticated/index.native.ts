import type {EnsureQAAuthenticated, HandleQAReauthRequired} from './types';

const ensureQAAuthenticated: EnsureQAAuthenticated = () => Promise.resolve();

const handleQAReauthRequired: HandleQAReauthRequired = () => {};

export {ensureQAAuthenticated, handleQAReauthRequired};
