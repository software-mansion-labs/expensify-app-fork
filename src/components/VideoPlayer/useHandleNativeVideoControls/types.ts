import type {VideoPlayer} from 'expo-video';
import type {MutableRefObject} from 'react';

type UseHandleNativeVideoControlParams = {
    videoPlayerRef: MutableRefObject<VideoPlayer | null>;
    isLocalFile: boolean;
    isOffline: boolean;
};
type UseHandleNativeVideoControl = (params: UseHandleNativeVideoControlParams) => void;

export default UseHandleNativeVideoControl;
