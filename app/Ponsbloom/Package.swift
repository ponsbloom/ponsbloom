// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "Ponsbloom",
    platforms: [.macOS(.v14)],
    dependencies: [],
    targets: [
        .executableTarget(
            name: "Ponsbloom",
            path: "Sources/Ponsbloom",
            resources: [
                .process("Resources"),
            ]
        ),
        .testTarget(
            name: "PonsbloomTests",
            dependencies: ["Ponsbloom"],
            path: "Tests/PonsbloomTests"
        ),
    ]
)
