import {render, screen} from '@testing-library/react-native';

import PopoverWithoutOverlay from '@components/PopoverWithoutOverlay';

import * as ModalActions from '@libs/actions/Modal';

import {Activity, createRef} from 'react';
import {View} from 'react-native';

const mockOnOpenPopover = jest.fn();
const mockClosePopover = jest.fn();

jest.mock('@components/PopoverProvider', () => ({
    usePopoverActions: () => ({onOpen: mockOnOpenPopover, close: mockClosePopover, setActivePopoverExtraAnchorRef: () => {}}),
}));

describe('PopoverWithoutOverlay inside an Activity', () => {
    beforeEach(() => {
        mockOnOpenPopover.mockClear();
        mockClosePopover.mockClear();
        jest.spyOn(ModalActions, 'onModalDidClose');
        // The real action writes to Onyx, which these tests do not read.
        jest.spyOn(ModalActions, 'willAlertModalBecomeVisible').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('does not replay the open side effects when an open popover is hidden and revealed', () => {
        // Given an open popover on a visible screen
        const anchorRef = createRef<View>();
        const withoutOverlayRef = createRef<View>();
        const onModalShow = jest.fn();
        const onModalHide = jest.fn();
        const onClose = jest.fn();
        const {rerender} = render(
            <Activity mode="visible">
                <PopoverWithoutOverlay
                    isVisible
                    anchorRef={anchorRef}
                    withoutOverlayRef={withoutOverlayRef}
                    onModalShow={onModalShow}
                    onModalHide={onModalHide}
                    onClose={onClose}
                >
                    <View testID="popoverContent" />
                </PopoverWithoutOverlay>
            </Activity>,
        );
        expect(onModalShow).toHaveBeenCalledTimes(1);
        expect(mockOnOpenPopover).toHaveBeenCalledTimes(1);

        // When the screen is hidden and revealed, which re-runs the isVisible effect with an unchanged value
        rerender(
            <Activity mode="hidden">
                <PopoverWithoutOverlay
                    isVisible
                    anchorRef={anchorRef}
                    withoutOverlayRef={withoutOverlayRef}
                    onModalShow={onModalShow}
                    onModalHide={onModalHide}
                    onClose={onClose}
                >
                    <View testID="popoverContent" />
                </PopoverWithoutOverlay>
            </Activity>,
        );
        rerender(
            <Activity mode="visible">
                <PopoverWithoutOverlay
                    isVisible
                    anchorRef={anchorRef}
                    withoutOverlayRef={withoutOverlayRef}
                    onModalShow={onModalShow}
                    onModalHide={onModalHide}
                    onClose={onClose}
                >
                    <View testID="popoverContent" />
                </PopoverWithoutOverlay>
            </Activity>,
        );

        // Then the parent and the popover registry still see a single open and no close, since the user never toggled the popover
        expect(onModalShow).toHaveBeenCalledTimes(1);
        expect(mockOnOpenPopover).toHaveBeenCalledTimes(1);
        expect(ModalActions.willAlertModalBecomeVisible).toHaveBeenCalledTimes(1);
        expect(onModalHide).not.toHaveBeenCalled();
        expect(mockClosePopover).not.toHaveBeenCalled();

        // Then the revealed popover is registered again, so Modal actions can still close it
        expect(ModalActions.areAllModalsHidden()).toBe(false);
    });

    it('does not replay the close side effects when a closed popover is hidden and revealed', () => {
        // Given a closed popover, whose mount already ran the close side effects once
        const anchorRef = createRef<View>();
        const withoutOverlayRef = createRef<View>();
        const onModalShow = jest.fn();
        const onModalHide = jest.fn();
        const {rerender} = render(
            <Activity mode="visible">
                <PopoverWithoutOverlay
                    isVisible={false}
                    anchorRef={anchorRef}
                    withoutOverlayRef={withoutOverlayRef}
                    onModalShow={onModalShow}
                    onModalHide={onModalHide}
                >
                    <View testID="popoverContent" />
                </PopoverWithoutOverlay>
            </Activity>,
        );
        expect(onModalHide).toHaveBeenCalledTimes(1);
        expect(ModalActions.onModalDidClose).toHaveBeenCalledTimes(1);

        // When the screen is hidden and revealed, which re-runs the isVisible effect with an unchanged value
        rerender(
            <Activity mode="hidden">
                <PopoverWithoutOverlay
                    isVisible={false}
                    anchorRef={anchorRef}
                    withoutOverlayRef={withoutOverlayRef}
                    onModalShow={onModalShow}
                    onModalHide={onModalHide}
                >
                    <View testID="popoverContent" />
                </PopoverWithoutOverlay>
            </Activity>,
        );
        rerender(
            <Activity mode="visible">
                <PopoverWithoutOverlay
                    isVisible={false}
                    anchorRef={anchorRef}
                    withoutOverlayRef={withoutOverlayRef}
                    onModalShow={onModalShow}
                    onModalHide={onModalHide}
                >
                    <View testID="popoverContent" />
                </PopoverWithoutOverlay>
            </Activity>,
        );

        // Then no second close reaches the parent or the Modal actions, since a replayed onModalDidClose would run a pending close callback again
        expect(onModalHide).toHaveBeenCalledTimes(1);
        expect(mockClosePopover).toHaveBeenCalledTimes(1);
        expect(ModalActions.onModalDidClose).toHaveBeenCalledTimes(1);
        expect(ModalActions.willAlertModalBecomeVisible).toHaveBeenCalledTimes(1);
        expect(onModalShow).not.toHaveBeenCalled();
    });

    it('fires the show and hide side effects once per real isVisible change', () => {
        // Given an open popover with no Activity around it
        const anchorRef = createRef<View>();
        const withoutOverlayRef = createRef<View>();
        const onModalShow = jest.fn();
        const onModalHide = jest.fn();
        const onClose = jest.fn();
        const {rerender} = render(
            <PopoverWithoutOverlay
                isVisible
                anchorRef={anchorRef}
                withoutOverlayRef={withoutOverlayRef}
                onModalShow={onModalShow}
                onModalHide={onModalHide}
                onClose={onClose}
            >
                <View testID="popoverContent" />
            </PopoverWithoutOverlay>,
        );
        expect(onModalShow).toHaveBeenCalledTimes(1);
        expect(mockOnOpenPopover).toHaveBeenCalledWith(expect.objectContaining({ref: withoutOverlayRef, close: onClose, anchorRef}));
        expect(ModalActions.areAllModalsHidden()).toBe(false);

        // When the parent closes it
        rerender(
            <PopoverWithoutOverlay
                isVisible={false}
                anchorRef={anchorRef}
                withoutOverlayRef={withoutOverlayRef}
                onModalShow={onModalShow}
                onModalHide={onModalHide}
                onClose={onClose}
            >
                <View testID="popoverContent" />
            </PopoverWithoutOverlay>,
        );

        // Then the hide side effects run once and the close handler is unregistered, so Modal actions no longer see an open modal
        expect(screen.queryByTestId('popoverContent')).not.toBeOnTheScreen();
        expect(onModalHide).toHaveBeenCalledTimes(1);
        expect(mockClosePopover).toHaveBeenCalledWith(anchorRef);
        expect(ModalActions.onModalDidClose).toHaveBeenCalledTimes(1);
        expect(ModalActions.areAllModalsHidden()).toBe(true);

        // When the parent opens it again
        rerender(
            <PopoverWithoutOverlay
                isVisible
                anchorRef={anchorRef}
                withoutOverlayRef={withoutOverlayRef}
                onModalShow={onModalShow}
                onModalHide={onModalHide}
                onClose={onClose}
            >
                <View testID="popoverContent" />
            </PopoverWithoutOverlay>,
        );

        // Then the show side effects run a second time and the close handler is registered again, matching one show per open
        expect(screen.getByTestId('popoverContent')).toBeOnTheScreen();
        expect(onModalShow).toHaveBeenCalledTimes(2);
        expect(mockOnOpenPopover).toHaveBeenCalledTimes(2);
        expect(onModalHide).toHaveBeenCalledTimes(1);
        expect(mockClosePopover).toHaveBeenCalledTimes(1);
        expect(ModalActions.willAlertModalBecomeVisible).toHaveBeenNthCalledWith(1, true, true);
        expect(ModalActions.willAlertModalBecomeVisible).toHaveBeenNthCalledWith(2, false, true);
        expect(ModalActions.willAlertModalBecomeVisible).toHaveBeenNthCalledWith(3, true, true);
        expect(ModalActions.areAllModalsHidden()).toBe(false);
    });
});
