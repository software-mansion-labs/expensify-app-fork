//
//  RCTShareExtensionHandlerModule.m
//  NewExpensify
//
//  Created by Bartek Krasoń on 23/02/2024.
//

#import <Foundation/Foundation.h>
#import "ios:NewExpensify:RCTShareExtensionHandlerModule.h"
#import <React/RCTLog.h>

NSString *const ShareExtensionGroupIdentifier = @"group.com.new-expensify";
NSString *const ShareExtensionFilesKey = @"ShareFiles";

@implementation RCTShareExtensionHandlerModule

// To export a module named RCTCalendarModule
RCT_EXPORT_MODULE(RCTShareExtensionHandlerModule);

RCT_EXPORT_METHOD(processFiles:(RCTResponseSenderBlock)callback)
{
  RCTLogInfo(@"Processing share extension files");
  NSUserDefaults *defaults = [[NSUserDefaults alloc] initWithSuiteName:ShareExtensionGroupIdentifier];
  NSString *sharedImagesFolderPath = [defaults objectForKey:ShareExtensionFilesKey];

  // Set default to NULL so it is not used when app is launched regularly.
  [defaults setObject:NULL forKey:ShareExtensionFilesKey];
  [defaults synchronize];

  if (sharedImagesFolderPath == NULL) {
      NSLog(@"handleShareExtension Missing 'folder' in shareExtensionData");
      return;
  }

  // Get image file names
  NSError *error = nil;
  NSArray *imageSrcPath = [[NSFileManager defaultManager] contentsOfDirectoryAtPath:sharedImagesFolderPath error:&error];

  if (imageSrcPath.count == 0) {
      NSLog(@"handleShareExtension Failed to find images in 'sharedImagesFolderPath'");
      return;
  }
  NSLog(@"handleShareExtension shared %lu images", imageSrcPath.count);

  NSArray *paths = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES);
  NSString *documentsDirectory = [paths objectAtIndex:0];
  NSMutableArray *imageFinalPaths = [NSMutableArray array];

  for (int i = 0; i < imageSrcPath.count; i++) {
      if (imageSrcPath[i] == NULL) {
          NSLog(@"handleShareExtension Invalid image in position %d, imageSrcPath[i] is nil", i);
          continue;
      }
      NSLog(@"handleShareExtension Valid image in position %d", i);
      NSString *srcImageAbsolutePath = [sharedImagesFolderPath stringByAppendingPathComponent:imageSrcPath[i]];
      UIImage *smartScanImage = [[UIImage alloc] initWithContentsOfFile:srcImageAbsolutePath];
      if (smartScanImage == NULL) {
          NSLog(@"handleShareExtension Failed to load image %@", srcImageAbsolutePath);
          continue;
      }
      
      // Correct image orientation so it displays correctly on expenses.
      UIGraphicsBeginImageContext(smartScanImage.size);
      [smartScanImage drawAtPoint:CGPointMake(0, 0)];
      CGContextRotateCTM (UIGraphicsGetCurrentContext(), 90 * M_PI/180);
      smartScanImage = UIGraphicsGetImageFromCurrentImageContext();
      UIGraphicsEndImageContext();

      // Save image to file.
      NSString *pathName = [NSString stringWithFormat:@"%@%@", [[NSUUID UUID] UUIDString], ShareImageFileExtension];
      NSString *path = [documentsDirectory stringByAppendingPathComponent:pathName];
      NSData *data = UIImagePNGRepresentation(smartScanImage);
      [data writeToFile:path atomically:YES];
      [imageFinalPaths addObject:path];
  }
  
  // Delete shared image folder
  if (![[NSFileManager defaultManager] removeItemAtPath:sharedImagesFolderPath error:&error]) {
      NSLog(@"Failed to delete shared image folder: %@, error: %@", sharedImagesFolderPath, error);
  }

  callback(@[@[imageFinalPaths]]);
}

@end
