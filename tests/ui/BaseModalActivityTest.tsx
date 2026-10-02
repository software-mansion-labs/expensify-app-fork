import {act, fireEvent, render, screen} from '@testing-library/react-native';

import BaseModal from '@components/Modal/BaseModal';
import type {ContainerProps} from '@components/Modal/ReanimatedModal/types';

import Navigation from '@libs/Navigation/Navigation';

import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';

import type {ReactNode} from 'react';

import React, {Activity, useEffect, useRef} from 'react';
import {Modal, View} from 'react-native';
import Onyx from 'react-native-onyx';

import getOnyxValue from '../utils/getOnyxValue';
import waitForBatchedUpdatesWithAct from '../utils/waitForBatchedUpdatesWithAct';

// The reanimated jest mock never runs Keyframe callbacks, so the Container stands in for the open and close
// animations and lets each test finish them. ReanimatedModal and BaseModal stay real.
const mockPendingOpenAnimations: Array<() => void> = [];
const mockPendingCloseAnimations: Array<() => void> = [];

// Module-level queue writers, because React Compiler rejects mutating a module value from inside a component.
function mockQueueOpenAnimation(finishAnimation: () => void) {
    mockPendingOpenAnimations.push(finishAnimation);
}

function mockQueueCloseAnimation(finishAnimation: () => void) {
    mockPendingCloseAnimations.push(finishAnimation);
}

// Declared at module level with the real React imports, so React Compiler recognizes the hooks; the factory only returns it.
function MockContainer({onOpenCallBack, onCloseCallBack, children}: Pick<ContainerProps, 'onOpenCallBack' | 'onCloseCallBack'> & {children?: ReactNode}) {
    const hasEntered = useRef(false);
    const latestOnCloseCallBack = useRef(onCloseCallBack);

    useEffect(() => {
        latestOnCloseCallBack.current = onCloseCallBack;
    }, [onCloseCallBack]);

    // An entering animation starts once per mounted instance, not again when an Activity reveal re-runs effects.
    useEffect(() => {
        if (hasEntered.current) {
            return;
        }
        hasEntered.current = true;
        mockQueueOpenAnimation(onOpenCallBack);
    }, [onOpenCallBack]);

    // An Activity hide also runs this cleanup, so a test clears the queue right before the close it finishes.
    useEffect(
        () => () => {
            mockQueueCloseAnimation(() => latestOnCloseCallBack.current());
        },
        [],
    );

    return <View testID="modalContainer">{children}</View>;
}

jest.mock('@components/Modal/ReanimatedModal/Container', () => MockContainer);

function finishPendingAnimations(pendingAnimations: Array<() => void>) {
    act(() => {
        for (const finishAnimation of pendingAnimations.splice(0)) {
            finishAnimation();
        }
    });
}

async function getIsModalVisibleInOnyx() {
    const modal = await getOnyxValue(ONYXKEYS.MODAL);
    return modal?.isVisible;
}

describe('BaseModal inside an Activity', () => {
    beforeAll(() => {
        Onyx.init({keys: ONYXKEYS});
    });

    beforeEach(async () => {
        mockPendingOpenAnimations.length = 0;
        mockPendingCloseAnimations.length = 0;
        // No navigator is mounted, and BaseModal only asks whether an RHP is on top before clearing the Onyx flag.
        jest.spyOn(Navigation, 'isTopmostRouteModalScreen').mockReturnValue(false);
        await Onyx.clear();
    });

    it('keeps onModalShow and onModalHide paired when an open centered modal is hidden, revealed and closed', async () => {
        // Given an open centered modal whose open animation has finished
        const onModalShow = jest.fn();
        const onModalHide = jest.fn();
        const {rerender} = render(
            <Activity mode="visible">
                <BaseModal
                    isVisible
                    type={CONST.MODAL.MODAL_TYPE.CENTERED}
                    onModalShow={onModalShow}
                    onModalHide={onModalHide}
                >
                    <View testID="modalContent" />
                </BaseModal>
            </Activity>,
        );
        finishPendingAnimations(mockPendingOpenAnimations);
        await waitForBatchedUpdatesWithAct();
        expect(onModalShow).toHaveBeenCalledTimes(1);

        // When the screen is hidden, revealed, and the modal finishes any open it replays
        rerender(
            <Activity mode="hidden">
                <BaseModal
                    isVisible
                    type={CONST.MODAL.MODAL_TYPE.CENTERED}
                    onModalShow={onModalShow}
                    onModalHide={onModalHide}
                >
                    <View testID="modalContent" />
                </BaseModal>
            </Activity>,
        );
        rerender(
            <Activity mode="visible">
                <BaseModal
                    isVisible
                    type={CONST.MODAL.MODAL_TYPE.CENTERED}
                    onModalShow={onModalShow}
                    onModalHide={onModalHide}
                >
                    <View testID="modalContent" />
                </BaseModal>
            </Activity>,
        );
        finishPendingAnimations(mockPendingOpenAnimations);
        await waitForBatchedUpdatesWithAct();

        // Then Onyx reports the modal as visible while it is open again, since the hide told Onyx it was gone
        expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(true);
        expect(await getIsModalVisibleInOnyx()).toBe(true);

        // When the user closes it and the close animation and the native dismiss finish
        mockPendingCloseAnimations.length = 0;
        rerender(
            <Activity mode="visible">
                <BaseModal
                    isVisible={false}
                    type={CONST.MODAL.MODAL_TYPE.CENTERED}
                    onModalShow={onModalShow}
                    onModalHide={onModalHide}
                >
                    <View testID="modalContent" />
                </BaseModal>
            </Activity>,
        );
        finishPendingAnimations(mockPendingCloseAnimations);
        fireEvent(screen.UNSAFE_getByType(Modal), 'dismiss');
        await waitForBatchedUpdatesWithAct();

        // Then every show the parent saw is matched by exactly one hide, and Onyx no longer reports a modal
        expect(onModalHide).toHaveBeenCalledTimes(onModalShow.mock.calls.length);
        expect(await getIsModalVisibleInOnyx()).toBe(false);
    });

    it('takes an open centered modal off the screen while its Activity is hidden', async () => {
        // Given an open centered modal whose open animation has finished
        const {rerender} = render(
            <Activity mode="visible">
                <BaseModal
                    isVisible
                    type={CONST.MODAL.MODAL_TYPE.CENTERED}
                >
                    <View testID="modalContent" />
                </BaseModal>
            </Activity>,
        );
        finishPendingAnimations(mockPendingOpenAnimations);
        await waitForBatchedUpdatesWithAct();

        // When the screen that owns it is hidden
        rerender(
            <Activity mode="hidden">
                <BaseModal
                    isVisible
                    type={CONST.MODAL.MODAL_TYPE.CENTERED}
                >
                    <View testID="modalContent" />
                </BaseModal>
            </Activity>,
        );
        await waitForBatchedUpdatesWithAct();

        // Then the native Modal is dismissed, since it is a separate window that the hidden screen cannot cover, and Onyx agrees
        expect(screen.UNSAFE_getByType(Modal).props.visible).toBe(false);
        expect(await getIsModalVisibleInOnyx()).toBe(false);
    });
});
