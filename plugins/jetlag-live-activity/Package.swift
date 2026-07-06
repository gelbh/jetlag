// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "JetlagLiveActivity",
    platforms: [.iOS(.v16)],
    products: [
        .library(
            name: "JetlagLiveActivity",
            targets: ["JetlagLiveActivityPlugin"]
        )
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")
    ],
    targets: [
        .target(
            name: "JetlagLiveActivityPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/JetlagLiveActivityPlugin"
        )
    ]
)
