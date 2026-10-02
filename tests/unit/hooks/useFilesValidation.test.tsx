import {act, render, renderHook, waitFor} from '@testing-library/react-native';

import type PDFThumbnailProps from '@components/PDFThumbnail/types';

import useFilesValidation from '@hooks/useFilesValidation';

import type * as FileUtilsModule from '@libs/fileDownload/FileUtils';
import {resizeImageIfNeeded} from '@libs/fileDownload/FileUtils';
import convertHeicImage from '@libs/fileDownload/heicConverter';
import validateAttachmentFile from '@libs/validateAttachmentFile';

import CONST from '@src/CONST';
import type {FileObject} from '@src/types/utils/Attachment';

import type {ValueOf} from 'type-fest';

import React, {Activity} from 'react';

import type * as MockUseConfirmModalUtil from '../../utils/mockUseConfirmModal';

import {getShowConfirmModalOption, mockShowConfirmModal, resetMockConfirmModal, resolveShowConfirmModal} from '../../utils/mockUseConfirmModal';
import waitForBatchedUpdatesWithAct from '../../utils/waitForBatchedUpdatesWithAct';

jest.mock('@hooks/useConfirmModal', () => {
    const {default: mockUseConfirmModal} = jest.requireActual<typeof MockUseConfirmModalUtil>('../../utils/mockUseConfirmModal');
    return mockUseConfirmModal;
});

jest.mock('@components/Modal/Global/ModalContext', () => {
    const {createMockModalContextModule} = jest.requireActual<typeof MockUseConfirmModalUtil>('../../utils/mockUseConfirmModal');
    return createMockModalContextModule();
});

jest.mock('@hooks/useLocalize', () => () => ({
    translate: (key: string) => key,
}));

jest.mock('@hooks/useThemeStyles', () => () => ({
    invisiblePDF: {},
}));

const mockSetIsLoaderVisible = jest.fn();

jest.mock('@components/FullScreenLoaderContext', () => ({
    useFullScreenLoaderActions: () => ({setIsLoaderVisible: mockSetIsLoaderVisible}),
}));

jest.mock('@libs/validateAttachmentFile', () => jest.fn());

jest.mock('@libs/fileDownload/heicConverter', () => jest.fn());

jest.mock('@libs/fileDownload/FileUtils', () => {
    const actual = jest.requireActual<typeof FileUtilsModule>('@libs/fileDownload/FileUtils');
    return {
        ...actual,
        resizeImageIfNeeded: jest.fn(),
    };
});

const mockValidateAttachmentFile = jest.mocked(validateAttachmentFile);
const mockConvertHeicImage = jest.mocked(convertHeicImage);
const mockResizeImageIfNeeded = jest.mocked(resizeImageIfNeeded);

type ValidateAttachmentResult = Awaited<ReturnType<typeof validateAttachmentFile>>;
type UseFilesValidationResult = ReturnType<typeof useFilesValidation>;

function createFile(overrides: Partial<FileObject> & {uri: string}): FileObject {
    return {
        name: 'file.jpg',
        size: 1024,
        type: 'image/jpeg',
        ...overrides,
    };
}

/** Mounts the hook with a fresh `onFilesValidated` spy. */
function setup() {
    const onFilesValidated = jest.fn();
    return {onFilesValidated, ...renderHook(() => useFilesValidation(onFilesValidated))};
}

/** Calls `validateFiles` inside `act`, matching how a real event handler would invoke it. */
function triggerValidation(result: {current: UseFilesValidationResult}, ...args: Parameters<UseFilesValidationResult['validateFiles']>) {
    act(() => {
        result.current.validateFiles(...args);
    });
}

/** Resolves the currently-open confirm modal (defaults to the user confirming). */
async function resolveModal(action: 'CONFIRM' | 'CLOSE' = 'CONFIRM') {
    await act(async () => {
        resolveShowConfirmModal({action});
    });
}

function mockValid(file: FileObject) {
    mockValidateAttachmentFile.mockResolvedValue({isValid: true, file});
}

function mockInvalid(error: ValueOf<typeof CONST.FILE_VALIDATION_ERRORS>) {
    mockValidateAttachmentFile.mockResolvedValue({isValid: false, error});
}

type FilesValidationProbeProps = {
    onFilesValidated: (files: FileObject[], dataTransferItems: DataTransferItem[]) => void;
    onRender: (result: UseFilesValidationResult) => void;
};

/** Hands the hook's return value to the test on every render so it can drive the hook inside an Activity. */
function FilesValidationProbe({onFilesValidated, onRender}: FilesValidationProbeProps) {
    onRender(useFilesValidation(onFilesValidated));
    return null;
}

/** Keeps the latest hook result so the test can call validateFiles after a hide or a reveal. */
function createResultHolder() {
    const holder: {current?: UseFilesValidationResult} = {};
    const onRender = (result: UseFilesValidationResult) => {
        holder.current = result;
    };
    return {result: holder, onRender};
}

function getPDFValidationProps(pdfValidationComponent: UseFilesValidationResult['PDFValidationComponent']): PDFThumbnailProps | undefined {
    // PDFValidationComponent is typed as a plain JSX.Element, so its `props` has no generic type information to narrow from.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
    return pdfValidationComponent?.props as unknown as PDFThumbnailProps | undefined;
}

describe('useFilesValidation', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        resetMockConfirmModal();
    });

    describe('guard & edge cases', () => {
        it('ignores a validateFiles call while a previous validation is still in progress', async () => {
            const file = createFile({uri: 'file-1'});
            let resolvePendingValidation: ((value: ValidateAttachmentResult) => void) | undefined;
            mockValidateAttachmentFile.mockImplementation(
                () =>
                    new Promise<ValidateAttachmentResult>((resolve) => {
                        resolvePendingValidation = resolve;
                    }),
            );

            const {result, onFilesValidated} = setup();
            triggerValidation(result, [file]);

            await waitFor(() => expect(mockValidateAttachmentFile).toHaveBeenCalledTimes(1));

            triggerValidation(result, [file]);

            // The second call was rejected because validation was already in progress.
            expect(mockValidateAttachmentFile).toHaveBeenCalledTimes(1);

            await act(async () => {
                resolvePendingValidation?.({isValid: true, file});
            });

            await waitFor(() => expect(onFilesValidated).toHaveBeenCalledTimes(1));
        });

        // TODO: bug — an empty list should be a no-op, not brick the hook. Out of scope for this refactor.
        it('an empty file list blocks all future validation calls', () => {
            const {result, onFilesValidated} = setup();
            triggerValidation(result, []);

            // `validateAndResizeFiles` returns immediately for an empty list without ever calling `reset()`,
            // so `isValidatingFiles` is stuck `true` and every future call is silently ignored.
            const file = createFile({uri: 'file-1'});
            mockValid(file);
            triggerValidation(result, [file]);

            expect(mockValidateAttachmentFile).not.toHaveBeenCalled();
            expect(onFilesValidated).not.toHaveBeenCalled();
        });
    });

    describe('successful validation', () => {
        it('validates and returns a single valid file without showing a modal', async () => {
            const validFile = createFile({uri: 'file-1'});
            mockValid(validFile);

            const {result, onFilesValidated} = setup();
            triggerValidation(result, [validFile]);

            await waitFor(() => expect(onFilesValidated).toHaveBeenCalledWith([validFile], []));
            expect(mockShowConfirmModal).not.toHaveBeenCalled();
        });

        it('sorts multiple valid files back into their original selection order', async () => {
            const fileA = createFile({uri: 'file-a'});
            const fileB = createFile({uri: 'file-b'});
            mockValidateAttachmentFile.mockImplementation(async (file) => ({isValid: true, file}) as ValidateAttachmentResult);

            const {result, onFilesValidated} = setup();
            triggerValidation(result, [fileA, fileB]);

            await waitFor(() => expect(onFilesValidated).toHaveBeenCalledWith([fileA, fileB], []));
        });
    });

    describe('single error modal', () => {
        it('shows a confirm modal for an invalid file and does not proceed when cancelled', async () => {
            const invalidFile = createFile({uri: 'file-1'});
            mockInvalid(CONST.FILE_VALIDATION_ERRORS.WRONG_FILE_TYPE);

            const {result, onFilesValidated} = setup();
            triggerValidation(result, [invalidFile]);

            await waitFor(() => expect(mockShowConfirmModal).toHaveBeenCalledTimes(1));
            expect(getShowConfirmModalOption('title')).toBe('attachmentPicker.wrongFileType');
            expect(getShowConfirmModalOption('confirmText')).toBe('common.close');
            expect(getShowConfirmModalOption('shouldShowCancelButton')).toBe(false);

            await resolveModal('CLOSE');

            expect(onFilesValidated).not.toHaveBeenCalled();
        });

        it('skips the invalid file and proceeds with the remaining valid files when confirmed', async () => {
            const validFile = createFile({uri: 'file-valid'});
            const invalidFile = createFile({uri: 'file-invalid'});
            mockValidateAttachmentFile.mockImplementation(async (file) =>
                file === invalidFile ? {isValid: false, error: CONST.FILE_VALIDATION_ERRORS.WRONG_FILE_TYPE} : {isValid: true, file},
            );

            const {result, onFilesValidated} = setup();
            triggerValidation(result, [validFile, invalidFile]);

            await waitFor(() => expect(mockShowConfirmModal).toHaveBeenCalledTimes(1));
            expect(getShowConfirmModalOption('confirmText')).toBe('common.continue');
            expect(getShowConfirmModalOption('shouldShowCancelButton')).toBe(true);

            await resolveModal('CONFIRM');

            await waitFor(() => expect(onFilesValidated).toHaveBeenCalledWith([validFile], []));
        });

        it('discards the entire batch on cancel, even files that already passed validation', async () => {
            const validFile = createFile({uri: 'file-valid'});
            const invalidFile = createFile({uri: 'file-invalid'});
            mockValidateAttachmentFile.mockImplementation(async (file) =>
                file === invalidFile ? {isValid: false, error: CONST.FILE_VALIDATION_ERRORS.WRONG_FILE_TYPE} : {isValid: true, file},
            );

            const {result, onFilesValidated} = setup();
            triggerValidation(result, [validFile, invalidFile]);

            await waitFor(() => expect(mockShowConfirmModal).toHaveBeenCalledTimes(1));

            await resolveModal('CLOSE');

            expect(onFilesValidated).not.toHaveBeenCalled();

            // Confirms the batch was fully discarded and the hook reset (not stuck on the valid file).
            const nextFile = createFile({uri: 'file-next'});
            mockValid(nextFile);
            triggerValidation(result, [nextFile]);
            await waitFor(() => expect(onFilesValidated).toHaveBeenCalledWith([nextFile], []));
        });
    });

    describe('multiple sequential error modals', () => {
        it('walks through multiple errors one at a time, switching to non-cancellable wording on the last one, and resets without proceeding once all files are invalid', async () => {
            const firstInvalidFile = createFile({uri: 'file-1'});
            const secondInvalidFile = createFile({uri: 'file-2'});
            mockValidateAttachmentFile.mockImplementation(async (file) =>
                file === firstInvalidFile ? {isValid: false, error: CONST.FILE_VALIDATION_ERRORS.WRONG_FILE_TYPE} : {isValid: false, error: CONST.FILE_VALIDATION_ERRORS.FILE_CORRUPTED},
            );

            const {result, onFilesValidated} = setup();
            triggerValidation(result, [firstInvalidFile, secondInvalidFile]);

            await waitFor(() => expect(mockShowConfirmModal).toHaveBeenCalledTimes(1));
            expect(getShowConfirmModalOption('title')).toBe('attachmentPicker.someFilesCantBeUploaded');

            await resolveModal('CONFIRM');

            await waitFor(() => expect(mockShowConfirmModal).toHaveBeenCalledTimes(2));
            expect(getShowConfirmModalOption('title')).toBe('attachmentPicker.attachmentError');
            // No valid files survived, so the final modal drops the "Continue" wording and cancel button.
            expect(getShowConfirmModalOption('confirmText')).toBe('common.close');
            expect(getShowConfirmModalOption('shouldShowCancelButton')).toBe(false);

            await resolveModal('CONFIRM');

            // No valid files survived, so validation should complete without ever calling onFilesValidated.
            await waitFor(() => expect(mockValidateAttachmentFile).toHaveBeenCalledTimes(2));
            expect(onFilesValidated).not.toHaveBeenCalled();

            // Confirms the hook reset itself (a stuck `isValidatingFiles` flag would make this call a no-op).
            const nextValidFile = createFile({uri: 'file-3'});
            mockValid(nextValidFile);
            triggerValidation(result, [nextValidFile]);
            await waitFor(() => expect(onFilesValidated).toHaveBeenCalledWith([nextValidFile], []));
        });
    });

    describe('max file limit', () => {
        function createOverLimitFiles() {
            const maxFileLimit = CONST.API_ATTACHMENT_VALIDATIONS.MAX_FILE_LIMIT;
            return {maxFileLimit, files: Array.from({length: maxFileLimit + 1}, (_, index) => createFile({uri: `file-${index}`}))};
        }

        it('shows the max file limit modal immediately and validates only the truncated list once confirmed', async () => {
            const {maxFileLimit, files} = createOverLimitFiles();
            mockValidateAttachmentFile.mockImplementation(async (file) => ({isValid: true, file}) as ValidateAttachmentResult);

            const {result, onFilesValidated} = setup();
            triggerValidation(result, files);

            await waitFor(() => expect(mockShowConfirmModal).toHaveBeenCalledTimes(1));
            expect(getShowConfirmModalOption('title')).toBe('attachmentPicker.someFilesCantBeUploaded');
            // The limit is enforced up front, so no file is validated until the user confirms.
            expect(mockValidateAttachmentFile).not.toHaveBeenCalled();

            await resolveModal('CONFIRM');

            await waitFor(() => expect(onFilesValidated).toHaveBeenCalledWith(files.slice(0, maxFileLimit), []));
            expect(mockValidateAttachmentFile).toHaveBeenCalledTimes(maxFileLimit);
        });

        it('discards the entire selection when the max-file-limit modal is cancelled', async () => {
            const {files} = createOverLimitFiles();
            mockValidateAttachmentFile.mockImplementation(async (file) => ({isValid: true, file}) as ValidateAttachmentResult);

            const {result, onFilesValidated} = setup();
            triggerValidation(result, files);

            await waitFor(() => expect(mockShowConfirmModal).toHaveBeenCalledTimes(1));

            await resolveModal('CLOSE');

            // Cancelling means none of the files are ever validated, not even the first 30.
            expect(mockValidateAttachmentFile).not.toHaveBeenCalled();
            expect(onFilesValidated).not.toHaveBeenCalled();

            // Hook reset itself and accepts a new call.
            const nextFile = createFile({uri: 'file-next'});
            triggerValidation(result, [nextFile]);
            await waitFor(() => expect(onFilesValidated).toHaveBeenCalledWith([nextFile], []));
        });
    });

    describe('HEIC/HEIF conversion', () => {
        it('converts a HEIC file and includes the converted result', async () => {
            const heicFile = createFile({uri: 'file-heic', name: 'photo.heic'});
            const convertedFile = createFile({uri: 'file-heic-converted', name: 'photo.jpg', size: 2048});
            mockInvalid(CONST.FILE_VALIDATION_ERRORS.HEIC_OR_HEIF_IMAGE);
            mockConvertHeicImage.mockImplementation((file, callbacks) => callbacks?.onSuccess?.(convertedFile));

            const {result, onFilesValidated} = setup();
            triggerValidation(result, [heicFile]);

            await waitFor(() => expect(onFilesValidated).toHaveBeenCalledWith([convertedFile], []));
        });

        it('blocks the file and shows an error when HEIC conversion fails', async () => {
            const heicFile = createFile({uri: 'file-heic', name: 'photo.heic'});
            mockInvalid(CONST.FILE_VALIDATION_ERRORS.HEIC_OR_HEIF_IMAGE);
            mockConvertHeicImage.mockImplementation((file, callbacks) => callbacks?.onError?.(new Error('conversion failed'), file));

            const {result} = setup();
            triggerValidation(result, [heicFile]);

            await waitFor(() => expect(mockShowConfirmModal).toHaveBeenCalledTimes(1));
            expect(getShowConfirmModalOption('title')).toBe('attachmentPicker.attachmentError');
            expect(getShowConfirmModalOption('prompt')).toBe('attachmentPicker.errorWhileConvertingHeic');
        });

        it('routes an oversized converted receipt image to resizing, then includes the resized result', async () => {
            const heicFile = createFile({uri: 'file-heic', name: 'photo.heic'});
            const oversizedConvertedFile = createFile({uri: 'file-heic-converted', name: 'photo.jpg', size: CONST.API_ATTACHMENT_VALIDATIONS.RECEIPT_MAX_SIZE + 1});
            const resizedFile = createFile({uri: 'file-heic-resized', name: 'photo.jpg', size: 1024});
            mockInvalid(CONST.FILE_VALIDATION_ERRORS.HEIC_OR_HEIF_IMAGE);
            mockConvertHeicImage.mockImplementation((file, callbacks) => callbacks?.onSuccess?.(oversizedConvertedFile));
            mockResizeImageIfNeeded.mockResolvedValue(resizedFile);

            const {result, onFilesValidated} = setup();
            triggerValidation(result, [heicFile], [], {isValidatingReceipts: true});

            await waitFor(() => expect(onFilesValidated).toHaveBeenCalledWith([resizedFile], []));
            expect(mockResizeImageIfNeeded).toHaveBeenCalledWith(oversizedConvertedFile);
        });
    });

    describe('image resizing', () => {
        it('resizes an oversized image and includes the resized result', async () => {
            const largeImage = createFile({uri: 'file-large', name: 'photo.jpg'});
            const resizedFile = createFile({uri: 'file-resized', name: 'photo.jpg', size: 1024});
            mockInvalid(CONST.FILE_VALIDATION_ERRORS.FILE_TOO_LARGE);
            mockResizeImageIfNeeded.mockResolvedValue(resizedFile);

            const {result, onFilesValidated} = setup();
            triggerValidation(result, [largeImage]);

            await waitFor(() => expect(onFilesValidated).toHaveBeenCalledWith([resizedFile], []));
        });

        it('surfaces a dimensions-too-large error when resizing rejects with that specific reason', async () => {
            const largeImage = createFile({uri: 'file-large', name: 'photo.jpg'});
            mockInvalid(CONST.FILE_VALIDATION_ERRORS.FILE_TOO_LARGE);
            mockResizeImageIfNeeded.mockRejectedValue(new Error(CONST.FILE_VALIDATION_ERRORS.IMAGE_DIMENSIONS_TOO_LARGE));

            const {result} = setup();
            triggerValidation(result, [largeImage]);

            await waitFor(() => expect(mockShowConfirmModal).toHaveBeenCalledTimes(1));
            expect(getShowConfirmModalOption('prompt')).toBe('attachmentPicker.imageDimensionsTooLarge');
        });

        it('[gap] masks any other resize failure reason behind a generic file-corrupted error', async () => {
            const largeImage = createFile({uri: 'file-large', name: 'photo.jpg'});
            mockInvalid(CONST.FILE_VALIDATION_ERRORS.FILE_TOO_LARGE);
            mockResizeImageIfNeeded.mockRejectedValue(new Error('some unrelated network failure'));

            const {result} = setup();
            triggerValidation(result, [largeImage]);

            await waitFor(() => expect(mockShowConfirmModal).toHaveBeenCalledTimes(1));
            // The real failure reason never reaches the user — it's always shown as a generic corruption error.
            expect(getShowConfirmModalOption('prompt')).toBe('attachmentPicker.errorWhileSelectingCorruptedAttachment');
        });
    });

    describe('PDF validation', () => {
        async function triggerPDFCallback(
            result: {current: UseFilesValidationResult},
            pdfFile: FileObject,
            callback: 'onLoadSuccess' | 'onLoadError' | 'onPassword',
            validationOptions?: Parameters<UseFilesValidationResult['validateFiles']>[2],
        ) {
            mockValid(pdfFile);
            triggerValidation(result, [pdfFile], [], validationOptions);
            await waitFor(() => expect(result.current.PDFValidationComponent).toBeDefined());
            act(() => {
                getPDFValidationProps(result.current.PDFValidationComponent)?.[callback]?.();
            });
        }

        it('validates a PDF thumbnail and proceeds once it loads successfully', async () => {
            const pdfFile = createFile({uri: 'file-pdf', name: 'document.pdf'});
            const {result, onFilesValidated} = setup();

            await triggerPDFCallback(result, pdfFile, 'onLoadSuccess');

            await waitFor(() => expect(onFilesValidated).toHaveBeenCalledWith([pdfFile], []));
        });

        it('shows a corrupted-file error when the PDF thumbnail fails to load', async () => {
            const pdfFile = createFile({uri: 'file-pdf', name: 'document.pdf'});
            const {result, onFilesValidated} = setup();

            await triggerPDFCallback(result, pdfFile, 'onLoadError');

            await waitFor(() => expect(mockShowConfirmModal).toHaveBeenCalledTimes(1));
            expect(getShowConfirmModalOption('title')).toBe('attachmentPicker.attachmentError');

            await resolveModal('CONFIRM');

            expect(onFilesValidated).not.toHaveBeenCalled();
        });

        it('treats a password-protected PDF as an error when validating receipts', async () => {
            const pdfFile = createFile({uri: 'file-pdf', name: 'document.pdf'});
            const {result} = setup();

            await triggerPDFCallback(result, pdfFile, 'onPassword', {isValidatingReceipts: true});

            await waitFor(() => expect(mockShowConfirmModal).toHaveBeenCalledTimes(1));
            expect(getShowConfirmModalOption('title')).toBe('attachmentPicker.attachmentError');
            expect(getShowConfirmModalOption('prompt')).toBe('attachmentPicker.protectedPDFNotSupported');
        });

        it('treats a password-protected PDF as valid when not validating receipts', async () => {
            const pdfFile = createFile({uri: 'file-pdf', name: 'document.pdf'});
            const {result, onFilesValidated} = setup();

            await triggerPDFCallback(result, pdfFile, 'onPassword', {isValidatingReceipts: false});

            await waitFor(() => expect(onFilesValidated).toHaveBeenCalledWith([pdfFile], []));
            expect(mockShowConfirmModal).not.toHaveBeenCalled();
        });
    });

    describe('Activity hide and reveal', () => {
        it('validates a pick made after the screen was hidden and revealed', async () => {
            // Given a hook host inside a visible Activity that is hidden and then revealed while idle
            const file = createFile({uri: 'file-1'});
            mockValid(file);
            const onFilesValidated = jest.fn();
            const {result, onRender} = createResultHolder();
            const {rerender} = render(
                <Activity mode="visible">
                    <FilesValidationProbe
                        onFilesValidated={onFilesValidated}
                        onRender={onRender}
                    />
                </Activity>,
            );
            rerender(
                <Activity mode="hidden">
                    <FilesValidationProbe
                        onFilesValidated={onFilesValidated}
                        onRender={onRender}
                    />
                </Activity>,
            );
            rerender(
                <Activity mode="visible">
                    <FilesValidationProbe
                        onFilesValidated={onFilesValidated}
                        onRender={onRender}
                    />
                </Activity>,
            );

            // When the user picks a file after the reveal
            act(() => {
                result.current?.validateFiles([file]);
            });

            // Then the pick is delivered because the hide did not leave the hook in an unmounted state
            await waitFor(() => expect(onFilesValidated).toHaveBeenCalledWith([file], []));
        });

        it('drops a pick that arrives while the screen is hidden', async () => {
            // Given a hook host inside an Activity that is hidden while idle
            const file = createFile({uri: 'file-hidden'});
            mockValid(file);
            const onFilesValidated = jest.fn();
            const {result, onRender} = createResultHolder();
            const {rerender} = render(
                <Activity mode="visible">
                    <FilesValidationProbe
                        onFilesValidated={onFilesValidated}
                        onRender={onRender}
                    />
                </Activity>,
            );
            rerender(
                <Activity mode="hidden">
                    <FilesValidationProbe
                        onFilesValidated={onFilesValidated}
                        onRender={onRender}
                    />
                </Activity>,
            );

            // When a late picker callback delivers a file while the screen is hidden
            act(() => {
                result.current?.validateFiles([file]);
            });
            await waitForBatchedUpdatesWithAct();

            // Then the hidden screen neither validates nor delivers it, like a hide drops a run in flight
            expect(mockValidateAttachmentFile).not.toHaveBeenCalled();
            expect(onFilesValidated).not.toHaveBeenCalled();
        });

        it('accepts a new pick after a validation finished while the screen was hidden', async () => {
            // Given a validation that is still waiting for validateAttachmentFile when the screen is hidden
            const staleFile = createFile({uri: 'file-stale'});
            const newFile = createFile({uri: 'file-new'});
            let resolveStaleValidation: ((value: ValidateAttachmentResult) => void) | undefined;
            mockValidateAttachmentFile.mockImplementationOnce(
                () =>
                    new Promise<ValidateAttachmentResult>((resolve) => {
                        resolveStaleValidation = resolve;
                    }),
            );
            const onFilesValidated = jest.fn();
            const {result, onRender} = createResultHolder();
            const {rerender} = render(
                <Activity mode="visible">
                    <FilesValidationProbe
                        onFilesValidated={onFilesValidated}
                        onRender={onRender}
                    />
                </Activity>,
            );
            act(() => {
                result.current?.validateFiles([staleFile]);
            });
            await waitFor(() => expect(mockValidateAttachmentFile).toHaveBeenCalledTimes(1));
            rerender(
                <Activity mode="hidden">
                    <FilesValidationProbe
                        onFilesValidated={onFilesValidated}
                        onRender={onRender}
                    />
                </Activity>,
            );

            // When the pending step finishes while hidden, the screen is revealed and the user picks again
            await act(async () => {
                resolveStaleValidation?.({isValid: true, file: staleFile});
            });
            rerender(
                <Activity mode="visible">
                    <FilesValidationProbe
                        onFilesValidated={onFilesValidated}
                        onRender={onRender}
                    />
                </Activity>,
            );
            mockValid(newFile);
            act(() => {
                result.current?.validateFiles([newFile]);
            });

            // Then the new pick is validated because the hide dropped the old run instead of wedging the hook
            await waitFor(() => expect(onFilesValidated).toHaveBeenCalledWith([newFile], []));
            expect(onFilesValidated).toHaveBeenCalledTimes(1);
        });

        it('does not deliver a validation that was in flight across a hide once it finishes after the reveal', async () => {
            // Given a validation that is still waiting for validateAttachmentFile across a hide and a reveal
            const staleFile = createFile({uri: 'file-stale'});
            let resolveStaleValidation: ((value: ValidateAttachmentResult) => void) | undefined;
            mockValidateAttachmentFile.mockImplementationOnce(
                () =>
                    new Promise<ValidateAttachmentResult>((resolve) => {
                        resolveStaleValidation = resolve;
                    }),
            );
            const onFilesValidated = jest.fn();
            const {result, onRender} = createResultHolder();
            const {rerender} = render(
                <Activity mode="visible">
                    <FilesValidationProbe
                        onFilesValidated={onFilesValidated}
                        onRender={onRender}
                    />
                </Activity>,
            );
            act(() => {
                result.current?.validateFiles([staleFile]);
            });
            await waitFor(() => expect(mockValidateAttachmentFile).toHaveBeenCalledTimes(1));
            rerender(
                <Activity mode="hidden">
                    <FilesValidationProbe
                        onFilesValidated={onFilesValidated}
                        onRender={onRender}
                    />
                </Activity>,
            );
            rerender(
                <Activity mode="visible">
                    <FilesValidationProbe
                        onFilesValidated={onFilesValidated}
                        onRender={onRender}
                    />
                </Activity>,
            );

            // When the old step finishes only after the reveal
            await act(async () => {
                resolveStaleValidation?.({isValid: true, file: staleFile});
            });

            // Then the dropped pick is not delivered because the stale run stops at its next step
            expect(onFilesValidated).not.toHaveBeenCalled();
        });

        it('hides the full-screen loader when the screen is hidden during a HEIC conversion', async () => {
            // Given a HEIC conversion that shows the loader and is still running when the screen is hidden
            const heicFile = createFile({uri: 'file-heic', name: 'photo.heic'});
            mockInvalid(CONST.FILE_VALIDATION_ERRORS.HEIC_OR_HEIF_IMAGE);
            mockConvertHeicImage.mockImplementation(() => {});
            const onFilesValidated = jest.fn();
            const {result, onRender} = createResultHolder();
            const {rerender} = render(
                <Activity mode="visible">
                    <FilesValidationProbe
                        onFilesValidated={onFilesValidated}
                        onRender={onRender}
                    />
                </Activity>,
            );
            act(() => {
                result.current?.validateFiles([heicFile]);
            });
            await waitFor(() => expect(mockSetIsLoaderVisible).toHaveBeenLastCalledWith(true));

            // When the screen is hidden
            rerender(
                <Activity mode="hidden">
                    <FilesValidationProbe
                        onFilesValidated={onFilesValidated}
                        onRender={onRender}
                    />
                </Activity>,
            );

            // Then the app-wide loader is hidden because it would otherwise cover the screen now on top
            expect(mockSetIsLoaderVisible).toHaveBeenLastCalledWith(false);
        });

        it('hides the full-screen loader and shows no error when the screen is hidden during the minimum loader time', async () => {
            // Given a failed HEIC conversion whose error waits for the minimum loader time when the screen is hidden
            jest.useFakeTimers();
            const heicFile = createFile({uri: 'file-heic', name: 'photo.heic'});
            mockInvalid(CONST.FILE_VALIDATION_ERRORS.HEIC_OR_HEIF_IMAGE);
            mockConvertHeicImage.mockImplementation((file, callbacks) => callbacks?.onError?.(new Error('conversion failed'), file));
            const onFilesValidated = jest.fn();
            const {result, onRender} = createResultHolder();
            const {rerender} = render(
                <Activity mode="visible">
                    <FilesValidationProbe
                        onFilesValidated={onFilesValidated}
                        onRender={onRender}
                    />
                </Activity>,
            );
            await act(async () => {
                result.current?.validateFiles([heicFile]);
            });
            expect(mockSetIsLoaderVisible).toHaveBeenLastCalledWith(true);

            // When the screen is hidden before the timer fires and is revealed after it would have fired
            rerender(
                <Activity mode="hidden">
                    <FilesValidationProbe
                        onFilesValidated={onFilesValidated}
                        onRender={onRender}
                    />
                </Activity>,
            );
            rerender(
                <Activity mode="visible">
                    <FilesValidationProbe
                        onFilesValidated={onFilesValidated}
                        onRender={onRender}
                    />
                </Activity>,
            );
            act(() => {
                jest.runOnlyPendingTimers();
            });
            jest.useRealTimers();

            // Then the loader is hidden and the dropped pick does not pop an error over the revealed screen
            expect(mockSetIsLoaderVisible).toHaveBeenLastCalledWith(false);
            expect(mockShowConfirmModal).not.toHaveBeenCalled();
        });

        it('drops a PDF that was still being checked when the screen was hidden', async () => {
            // Given a PDF thumbnail check that is still pending when the screen is hidden
            const pdfFile = createFile({uri: 'file-pdf', name: 'document.pdf'});
            mockValid(pdfFile);
            const onFilesValidated = jest.fn();
            const {result, onRender} = createResultHolder();
            const {rerender} = render(
                <Activity mode="visible">
                    <FilesValidationProbe
                        onFilesValidated={onFilesValidated}
                        onRender={onRender}
                    />
                </Activity>,
            );
            act(() => {
                result.current?.validateFiles([pdfFile]);
            });
            await waitFor(() => expect(result.current?.PDFValidationComponent).toBeDefined());
            const stalePDFProps = getPDFValidationProps(result.current?.PDFValidationComponent);

            // When the screen is hidden and revealed and the old thumbnail reports a successful load
            rerender(
                <Activity mode="hidden">
                    <FilesValidationProbe
                        onFilesValidated={onFilesValidated}
                        onRender={onRender}
                    />
                </Activity>,
            );
            rerender(
                <Activity mode="visible">
                    <FilesValidationProbe
                        onFilesValidated={onFilesValidated}
                        onRender={onRender}
                    />
                </Activity>,
            );
            const pdfValidationComponentAfterReveal = result.current?.PDFValidationComponent;
            act(() => {
                stalePDFProps?.onLoadSuccess?.();
            });

            // Then the thumbnail is gone and the dropped PDF is not delivered after the reveal
            expect(pdfValidationComponentAfterReveal).toBeUndefined();
            expect(onFilesValidated).not.toHaveBeenCalled();
        });

        it('validates the next PDF pick after a dropped thumbnail settles late', async () => {
            // Given a PDF thumbnail check that was dropped by a hide and settles only after the reveal
            const stalePdfFile = createFile({uri: 'file-pdf-stale', name: 'stale.pdf'});
            const nextPdfFile = createFile({uri: 'file-pdf-next', name: 'next.pdf'});
            mockValid(stalePdfFile);
            const onFilesValidated = jest.fn();
            const {result, onRender} = createResultHolder();
            const {rerender} = render(
                <Activity mode="visible">
                    <FilesValidationProbe
                        onFilesValidated={onFilesValidated}
                        onRender={onRender}
                    />
                </Activity>,
            );
            act(() => {
                result.current?.validateFiles([stalePdfFile]);
            });
            await waitFor(() => expect(result.current?.PDFValidationComponent).toBeDefined());
            const stalePDFProps = getPDFValidationProps(result.current?.PDFValidationComponent);
            rerender(
                <Activity mode="hidden">
                    <FilesValidationProbe
                        onFilesValidated={onFilesValidated}
                        onRender={onRender}
                    />
                </Activity>,
            );
            rerender(
                <Activity mode="visible">
                    <FilesValidationProbe
                        onFilesValidated={onFilesValidated}
                        onRender={onRender}
                    />
                </Activity>,
            );
            act(() => {
                stalePDFProps?.onLoadSuccess?.();
            });

            // When the user picks another PDF and its thumbnail loads
            mockValid(nextPdfFile);
            act(() => {
                result.current?.validateFiles([nextPdfFile]);
            });
            await waitFor(() => expect(result.current?.PDFValidationComponent).toBeDefined());
            act(() => {
                getPDFValidationProps(result.current?.PDFValidationComponent)?.onLoadSuccess?.();
            });

            // Then the late stale load is ignored and only the new PDF is delivered
            await waitFor(() => expect(onFilesValidated).toHaveBeenCalledTimes(1));
            expect(onFilesValidated).toHaveBeenCalledWith([nextPdfFile], expect.anything());
        });
    });

    describe('unmount safety', () => {
        it('does not call onFilesValidated once a pending HEIC conversion resolves after unmount', async () => {
            const heicFile = createFile({uri: 'file-heic', name: 'photo.heic'});
            let resolveConversion: (() => void) | undefined;
            mockInvalid(CONST.FILE_VALIDATION_ERRORS.HEIC_OR_HEIF_IMAGE);
            mockConvertHeicImage.mockImplementation((file, callbacks) => {
                resolveConversion = () => callbacks?.onSuccess?.(file);
            });

            const {result, unmount, onFilesValidated} = setup();
            triggerValidation(result, [heicFile]);

            await waitFor(() => expect(mockConvertHeicImage).toHaveBeenCalledTimes(1));

            unmount();

            // The unmount drops the run, so a conversion that finishes afterwards stops before touching onFilesValidated.
            act(() => {
                resolveConversion?.();
            });

            expect(onFilesValidated).not.toHaveBeenCalled();
        });

        it('does not start a validation for a pick that arrives after unmount', async () => {
            // Given an idle hook that has been unmounted
            const file = createFile({uri: 'file-late'});
            mockValid(file);
            const {result, unmount, onFilesValidated} = setup();
            const {validateFiles} = result.current;
            unmount();

            // When a late picker callback still calls validateFiles
            act(() => {
                validateFiles([file]);
            });
            await waitForBatchedUpdatesWithAct();

            // Then nothing is validated or delivered, so a gone screen cannot open the attachment flow
            expect(mockValidateAttachmentFile).not.toHaveBeenCalled();
            expect(onFilesValidated).not.toHaveBeenCalled();
        });
    });
});
