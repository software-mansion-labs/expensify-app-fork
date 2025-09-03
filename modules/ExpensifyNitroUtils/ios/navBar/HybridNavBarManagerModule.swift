import Foundation
import NitroModules

final class HybridNavBarManagerModule: HybridNavBarManagerModuleSpec {
    func setButtonStyle(style: NavBarButtonStyle) throws -> Void {
        fatalError("`setButtonStyle` should not be called on iOS")
    }
    func getType() throws -> String {
        fatalError("`getType` should not be called on iOS")
    }
}
    