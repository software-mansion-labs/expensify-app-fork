import createCancelConfirmModal from './createCancelConfirmModal';

const DefaultCancelConfirmModal = createCancelConfirmModal('DefaultCancelConfirmModal', {
    title: 'common.areYouSure',
    description: 'multifactorAuthentication.biometricsTest.areYouSureToReject',
    confirmButtonText: 'multifactorAuthentication.biometricsTest.rejectAuthentication',
    cancelButtonText: 'common.cancel',
});

const AuthorizeTransactionCancelConfirmModal = createCancelConfirmModal('AuthorizeTransactionCancelConfirmModal', {
    title: 'multifactorAuthentication.reviewTransaction.denyTransaction',
    description: 'multifactorAuthentication.reviewTransaction.areYouSureToDeny',
    confirmButtonText: 'multifactorAuthentication.reviewTransaction.denyTransaction',
    cancelButtonText: 'common.cancel',
});

const FreezeCardCancelConfirmModal = createCancelConfirmModal('FreezeCardCancelConfirmModal', {
    title: 'cardPage.freezeCard',
    description: 'multifactorAuthentication.fraudReview.ifYouCloseWeWillFreezeCard',
    confirmButtonText: 'cardPage.freezeCard',
    cancelButtonText: 'common.cancel',
});

const TerminateCardCancelConfirmModal = createCancelConfirmModal('TerminateCardCancelConfirmModal', {
    title: 'multifactorAuthentication.reviewTransaction.reviewTransaction',
    description: 'multifactorAuthentication.fraudReview.ifYouDoNotReviewWeWillTerminateCard',
    confirmButtonText: 'multifactorAuthentication.fraudReview.terminateCard',
    cancelButtonText: 'multifactorAuthentication.reviewTransaction.reviewTransaction',
});

export {DefaultCancelConfirmModal, AuthorizeTransactionCancelConfirmModal, FreezeCardCancelConfirmModal, TerminateCardCancelConfirmModal};
