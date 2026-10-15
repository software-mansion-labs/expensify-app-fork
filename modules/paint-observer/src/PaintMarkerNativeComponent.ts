import type {CodegenTypes, ViewProps} from 'react-native';

import {codegenNativeComponent} from 'react-native';

type PaintEvent = Readonly<{
    /** When the frame holding the mount that inserted the marker reaches the screen, in the `performance.now()` clock. */
    paintTime: CodegenTypes.Double;
}>;

// Codegen reads the props from an interface declared in this file
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface NativeProps extends ViewProps {
    onPaint?: CodegenTypes.DirectEventHandler<PaintEvent>;
}

export default codegenNativeComponent<NativeProps>('PaintMarker');
export type {PaintEvent, NativeProps};
