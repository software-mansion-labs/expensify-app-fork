package com.expensify.chat.intentHandler

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import com.expensify.chat.image.ImageUtils.copyUriToStorage


object IntentHandlerConstants {
    const val preferencesFile = "shareActionHandler"
    const val fileArrayProperty = "filePaths"
}


class ImageIntentHandler(private val context: Context) : AbstractIntentHandler() {
    override fun handle(intent: Intent?): Boolean {
         Log.i("ImageIntentHandler", "Handle intent" + intent.toString())
         if (intent == null) {
            return false
        }

        val action: String? = intent.action
        val type: String = intent.type ?: return false

         if(!type.startsWith("image/")) return false

         when(action) {
             Intent.ACTION_SEND -> {
                 Log.i("ImageIntentHandler", "Handle receive single image")
                 handleSingleImageIntent(intent, context)
                 onCompleted()
                 return true
             }
             Intent.ACTION_SEND_MULTIPLE -> {
                 handleMultipleImagesIntent(intent, context)
                 onCompleted()
                 return true
             }
         }
         return false
    }

    private fun handleSingleImageIntent(intent: Intent, context: Context) {
        (intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM))?.let { imageUri ->

            Log.i("ImageIntentHandler", "handleSingleImageIntent$imageUri")
            // Update UI to reflect image being shared
            if (imageUri == null) {
                return
            }

            val fileArrayList: ArrayList<String> = ArrayList()
            val resultingPath: String? = copyUriToStorage(imageUri, context)
            if (resultingPath != null) {
                fileArrayList.add(resultingPath)
                val sharedPreferences = context.getSharedPreferences(IntentHandlerConstants.preferencesFile, Context.MODE_PRIVATE)
                val editor = sharedPreferences.edit()
                editor.putStringSet(IntentHandlerConstants.fileArrayProperty, fileArrayList.toSet())
                editor.apply()
            }
        }
    }

    private fun handleMultipleImagesIntent(intent: Intent, context: Context) {

        val resultingImagePaths = ArrayList<String>()

        (intent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM))?.let { imageUris ->
            for (imageUri in imageUris) {
                val resultingPath: String? = copyUriToStorage(imageUri, context)
                if (resultingPath != null) {
                    resultingImagePaths.add(resultingPath)
                }
            }
        }
//        Yapl.getInstance().callIntentCallback(resultingImagePaths)
    }

    override fun onCompleted() {
        val uri: Uri = Uri.parse("new-expensify://share/root")
        val deepLinkIntent = Intent(Intent.ACTION_VIEW, uri)
        deepLinkIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        context.startActivity(deepLinkIntent)
    }

}