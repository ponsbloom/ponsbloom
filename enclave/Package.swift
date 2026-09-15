// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "PonsbloomEnclave",
    platforms: [.macOS(.v13)],
    products: [
        .library(name: "PonsbloomEnclave", type: .static, targets: ["PonsbloomEnclave"]),
        .executable(name: "ponsbloom-enclave", targets: ["PonsbloomEnclaveCLI"]),
    ],
    targets: [
        .target(name: "PonsbloomEnclave"),
        .executableTarget(
            name: "PonsbloomEnclaveCLI",
            dependencies: ["PonsbloomEnclave"]
        ),
        .testTarget(name: "PonsbloomEnclaveTests", dependencies: ["PonsbloomEnclave"]),
    ]
)
