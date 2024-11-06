import type HybridAppSettings from './types';

function parseHybridAppSettings(hybridAppSettings: string): HybridAppSettings {
    return JSON.parse(hybridAppSettings) as HybridAppSettings;
}

export default parseHybridAppSettings;
