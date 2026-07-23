import SwiftUI

enum HushColor {
    static let ink = Color(red: 0.08, green: 0.10, blue: 0.18)
    static let inkMuted = Color(red: 0.36, green: 0.39, blue: 0.50)
    static let midnight = Color(red: 0.035, green: 0.045, blue: 0.11)
    static let dusk = Color(red: 0.11, green: 0.10, blue: 0.25)
    static let indigo = Color(red: 0.35, green: 0.38, blue: 0.94)
    static let violet = Color(red: 0.68, green: 0.45, blue: 0.98)
    static let cyan = Color(red: 0.33, green: 0.86, blue: 0.94)
    static let mint = Color(red: 0.48, green: 0.91, blue: 0.78)
    static let warm = Color(red: 1.00, green: 0.76, blue: 0.54)
    static let textPrimary = Color.white.opacity(0.96)
    static let textSecondary = Color.white.opacity(0.66)
    static let panel = Color.white.opacity(0.085)
    static let panelStrong = Color.white.opacity(0.14)
    static let hairline = Color.white.opacity(0.14)
}

enum HushSpacing {
    static let xxs: CGFloat = 4
    static let xs: CGFloat = 8
    static let sm: CGFloat = 12
    static let md: CGFloat = 16
    static let lg: CGFloat = 24
    static let xl: CGFloat = 32
    static let xxl: CGFloat = 44
}

enum HushRadius {
    static let small: CGFloat = 12
    static let medium: CGFloat = 18
    static let large: CGFloat = 28
    static let capsule: CGFloat = 999
}

enum HushType {
    static let eyebrow = Font.system(size: 11, weight: .semibold, design: .rounded)
    static let caption = Font.system(size: 12, weight: .medium, design: .rounded)
    static let body = Font.system(size: 15, weight: .regular, design: .rounded)
    static let bodyStrong = Font.system(size: 15, weight: .semibold, design: .rounded)
    static let title = Font.system(size: 25, weight: .semibold, design: .rounded)
    static let hero = Font.system(size: 36, weight: .medium, design: .rounded)
    static let timer = Font.system(size: 54, weight: .light, design: .rounded).monospacedDigit()
}
