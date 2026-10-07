import ConfirmModal from '@components/ConfirmModal';
import type {MultifactorAuthenticationCancelConfirm} from '@components/MultifactorAuthentication/config/types';

import useLocalize from '@hooks/useLocalize';

import React from 'react';

type BaseProps = Required<MultifactorAuthenticationCancelConfirm>;

type CancelConfirmModalProps = {
    isVisible: boolean;
    /** Blocks the confirm button with a spinner while a request that a cancel can't take back is in flight. */
    isConfirmLoading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};

type CancelConfirmModalBaseProps = CancelConfirmModalProps & BaseProps;

function CancelConfirmModalBase({isVisible, isConfirmLoading, onConfirm, onCancel, title, description, confirmButtonText, cancelButtonText}: CancelConfirmModalBaseProps) {
    const {translate} = useLocalize();

    return (
        <ConfirmModal
            danger
            title={translate(title)}
            onConfirm={onConfirm}
            onCancel={onCancel}
            isVisible={isVisible}
            isConfirmLoading={isConfirmLoading}
            prompt={translate(description)}
            confirmText={translate(confirmButtonText)}
            cancelText={translate(cancelButtonText)}
            shouldShowCancelButton
        />
    );
}

CancelConfirmModalBase.displayName = 'CancelConfirmModalBase';

function createCancelConfirmModal(displayName: string, baseProps: BaseProps): (props: CancelConfirmModalProps) => React.ReactElement<CancelConfirmModalProps> {
    function CancelConfirmModal(mutableProps: CancelConfirmModalProps) {
        const props = {...baseProps, ...mutableProps};

        return <CancelConfirmModalBase {...props} />;
    }

    CancelConfirmModal.displayName = displayName;

    return CancelConfirmModal;
}

export default createCancelConfirmModal;
export type {CancelConfirmModalProps};
