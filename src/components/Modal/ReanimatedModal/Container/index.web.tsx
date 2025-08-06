import React, {useEffect, useMemo, useRef} from 'react';
import Animated from 'react-native-reanimated';
import type ReanimatedModalProps from '@components/Modal/ReanimatedModal/types';
import type {ContainerProps} from '@components/Modal/ReanimatedModal/types';
import {getModalInAnimation, getModalOutAnimation} from '@components/Modal/ReanimatedModal/utils';
import useThemeStyles from '@hooks/useThemeStyles';
import CONST from '@src/CONST';

function Container({
    style,
    animationIn,
    animationOut,
    animationInTiming = CONST.MODAL.ANIMATION_TIMING.DEFAULT_IN,
    animationOutTiming = CONST.MODAL.ANIMATION_TIMING.DEFAULT_OUT,
    onOpenCallBack,
    onCloseCallBack,
    type,
    ...props
}: ReanimatedModalProps & ContainerProps) {
    const styles = useThemeStyles();
    const onOpenCallBackRef = useRef(onOpenCallBack);
    const onCloseCallbackRef = useRef(onCloseCallBack);

    useEffect(() => {
        onOpenCallBackRef.current = onOpenCallBack;
        onCloseCallbackRef.current = onCloseCallBack;
    }, [onCloseCallBack, onOpenCallBack]);

    const Entering = useMemo(
        () =>
            getModalInAnimation(animationIn)
                .duration(animationInTiming)
                // eslint-disable-next-line react-compiler/react-compiler
                .withCallback(() => onOpenCallBackRef.current()),
        [animationInTiming, animationIn],
    );
    const Exiting = useMemo(
        () =>
            getModalOutAnimation(animationOut)
                .duration(animationOutTiming)
                // eslint-disable-next-line react-compiler/react-compiler
                .withCallback(() => onCloseCallbackRef.current()),
        [animationOutTiming, animationOut],
    );

    return (
        <Animated.View
            style={[style, type !== CONST.MODAL.MODAL_TYPE.RIGHT_DOCKED && type !== CONST.MODAL.MODAL_TYPE.POPOVER && [styles.modalContainer, styles.modalAnimatedContainer], {zIndex: 1}]}
            entering={Entering}
            exiting={Exiting}
            // eslint-disable-next-line react/jsx-props-no-spreading
            {...props}
        >
            {props.children}
        </Animated.View>
    );
}

Container.displayName = 'ModalContainer';

export default Container;
