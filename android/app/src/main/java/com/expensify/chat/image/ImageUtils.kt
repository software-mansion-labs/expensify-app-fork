package com.expensify.chat.image

import android.content.Context
import android.net.Uri
import android.os.Environment
import android.util.Log
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream


object ImageUtils {
    private const val tag = "ImageUtils"
    private const val maxPictureWidth = 2400
    private const val optimalPictureSize = maxPictureWidth * maxPictureWidth
    private const val defaultImageExtension = ".jpg"

    private fun getUniqueImageFilePrefix(): String {
        return System.currentTimeMillis().toString()
    }

    /**
     * Checks if external storage is available.
     *
     * @return true if external storage is available, mounted and writable, false otherwise.
     */
    private fun isExternalStorageAvailable(): Boolean {
        // Make sure the media storage is mounted (MEDIA_MOUNTED implies writable)
        val state: String = Environment.getExternalStorageState()
        if (state != Environment.MEDIA_MOUNTED) {
            Log.w(tag, "External storage requested but not available" )
            return false
        }
        return true
    }

    /**
     * Synchronous method
     *
     * @param context
     * @param imageUri
     * @param destinationFile
     * @throws IOException
     */
    @Throws(IOException::class)
    fun saveImageFromMediaProviderUri(imageUri: Uri?, destinationFile: File?, context: Context) {
        val inputStream: InputStream? = imageUri?.let { context.contentResolver.openInputStream(it) }
        val outputStream: OutputStream = FileOutputStream(destinationFile)
        inputStream?.use { input ->
            outputStream.use { output ->
                input.copyTo(output)
            }
        }
    }

    /**
     * Creates an image file into the internal or external storage.
     *
     * @param context
     * @return
     * @throws IOException
     */
    @Throws(IOException::class)
    fun createImageFile(context: Context): File {

        // Create an image file name
        val file: File = File.createTempFile(
            getUniqueImageFilePrefix(),
            defaultImageExtension,
            getPhotoDirectory(context)
        )
        Log.i(tag, "Created a temporary file for the photo at" + file.absolutePath)
        return file
    }

    /**
     * Determines where the photo directory is based on if we can use external storage or not
     *
     * @param context
     * @return File   the directory
     */
    private fun getPhotoDirectory(context: Context): File? {
        val photoDirectory: File = if (isExternalStorageAvailable()) File(
            context.getExternalFilesDir(Environment.DIRECTORY_PICTURES), "Expensify"
        ) else File(context.filesDir.absolutePath, "Expensify")
        if (!photoDirectory.exists()) {
            photoDirectory.mkdir()
        }
        return photoDirectory
    }

    /**
     * Copy the given Uri to storage
     *
     * @param uri
     * @param context
     * @return The absolute path of the image
     */
    fun copyUriToStorage(uri: Uri?, context: Context): String? {
        var resultingPath: String? = null
        try {
            val imageFile: File = createImageFile(context)
            saveImageFromMediaProviderUri(uri, imageFile, context)
            resultingPath = imageFile.absolutePath
            Log.i("ImageIntentHandler", "save image$resultingPath")

        } catch (ex: IOException) {
            Log.e(tag, "Couldn't save image from intent", ex)
        }
        return resultingPath
    }
}