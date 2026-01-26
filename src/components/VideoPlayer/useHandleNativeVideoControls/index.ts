import type UseHandleNativeVideoControl from './types';

/**
 * Web implementation for managing native video controls.
 * With expo-video, native controls are managed through the VideoView component's
 * nativeControls prop, so this hook is a no-op.
 */
const useHandleNativeVideoControls: UseHandleNativeVideoControl = () => {};

export default useHandleNativeVideoControls;
