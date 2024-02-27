import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

class ShareViewController: UIViewController {
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        
        guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem,
            let itemProvider = extensionItem.attachments?.first as? NSItemProvider else {
            return
        }
      
      itemProvider.loadItem(forTypeIdentifier: UTType.image.identifier, options: nil) { [weak self] (url, error) in
          if let error = error {
              self?.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
          }
          else if let shareURL = url as? URL {
              DispatchQueue.main.async {
                  let customURL = URL(string: "new-expensify://share")
                  self?.launchApp(customURL: customURL)
              }
          }
          self?.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
      }
    }

    private func launchApp(customURL: URL?) {
        print("TEST LAUNCH APP")
        guard let url = customURL else { return }
        let selectorOpenURL = sel_registerName("openURL:")
        var responder: UIResponder? = self
        while responder != nil {
            if responder!.responds(to: selectorOpenURL) {
                responder!.perform(selectorOpenURL, with: url)
            }
           responder = responder!.next
        }
    }
}
