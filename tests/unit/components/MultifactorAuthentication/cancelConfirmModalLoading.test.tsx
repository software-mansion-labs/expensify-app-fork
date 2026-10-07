import {render} from '@testing-library/react-native';

import {DefaultCancelConfirmModal} from '@components/MultifactorAuthentication/components/Modals';

import React from 'react';

// Only the loading prop the cancel modal forwards matters here.
type ConfirmModalProps = {isConfirmLoading?: boolean};

const mockConfirmModal = jest.fn<null, [ConfirmModalProps]>(() => null);

jest.mock('@components/ConfirmModal', () => ({
    __esModule: true,
    default: (props: ConfirmModalProps) => mockConfirmModal(props),
}));

function lastConfirmLoading() {
    return mockConfirmModal.mock.lastCall?.[0].isConfirmLoading;
}

describe('cancel-confirmation modal loading', () => {
    const noop = () => {};

    beforeEach(() => mockConfirmModal.mockClear());

    it('keeps the spinner while the modal hides because the request settled', () => {
        const {rerender} = render(
            <DefaultCancelConfirmModal
                isVisible
                isConfirmLoading
                onConfirm={noop}
                onCancel={noop}
            />,
        );
        expect(lastConfirmLoading()).toBe(true);

        rerender(
            <DefaultCancelConfirmModal
                isVisible={false}
                isConfirmLoading={false}
                onConfirm={noop}
                onCancel={noop}
            />,
        );
        expect(lastConfirmLoading()).toBe(true);
    });

    it('drops the held spinner once the modal opens again', () => {
        const {rerender} = render(
            <DefaultCancelConfirmModal
                isVisible={false}
                isConfirmLoading
                onConfirm={noop}
                onCancel={noop}
            />,
        );

        rerender(
            <DefaultCancelConfirmModal
                isVisible
                isConfirmLoading={false}
                onConfirm={noop}
                onCancel={noop}
            />,
        );
        expect(lastConfirmLoading()).toBe(false);
    });
});
