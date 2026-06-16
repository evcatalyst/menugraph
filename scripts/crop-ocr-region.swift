import Foundation
import ImageIO
import CoreGraphics

func fail(_ message: String) -> Never {
    FileHandle.standardError.write((message + "\n").data(using: .utf8)!)
    exit(1)
}

func number(_ value: String, _ name: String) -> Double {
    guard let parsed = Double(value), parsed.isFinite else {
        fail("invalid \(name): \(value)")
    }
    return parsed
}

guard CommandLine.arguments.count >= 7 else {
    fail("usage: swift scripts/crop-ocr-region.swift IMAGE_PATH OUTPUT_PATH X Y WIDTH HEIGHT [PADDING] [MIN_OUTPUT_WIDTH]")
}

let imagePath = CommandLine.arguments[1]
let outputPath = CommandLine.arguments[2]
let x = number(CommandLine.arguments[3], "x")
let y = number(CommandLine.arguments[4], "y")
let width = number(CommandLine.arguments[5], "width")
let height = number(CommandLine.arguments[6], "height")
let padding = CommandLine.arguments.count >= 8 ? max(0, number(CommandLine.arguments[7], "padding")) : 0.04
let minOutputWidth = CommandLine.arguments.count >= 9 ? max(0, number(CommandLine.arguments[8], "min output width")) : 0

let imageUrl = URL(fileURLWithPath: imagePath)
guard let source = CGImageSourceCreateWithURL(imageUrl as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    fail("could not read image at \(imagePath)")
}

let pixelWidth = Double(image.width)
let pixelHeight = Double(image.height)

let paddedX = max(0, x - padding)
let paddedY = max(0, y - padding)
let paddedWidth = min(1 - paddedX, width + padding * 2)
let paddedHeight = min(1 - paddedY, height + padding * 2)

let cropX = max(0, floor(paddedX * pixelWidth))
let cropY = max(0, floor((1 - paddedY - paddedHeight) * pixelHeight))
let cropWidth = min(pixelWidth - cropX, ceil(paddedWidth * pixelWidth))
let cropHeight = min(pixelHeight - cropY, ceil(paddedHeight * pixelHeight))

guard cropWidth >= 1, cropHeight >= 1 else {
    fail("computed crop is empty")
}

let rect = CGRect(x: cropX, y: cropY, width: cropWidth, height: cropHeight)
guard let cropped = image.cropping(to: rect) else {
    fail("could not crop image")
}

let outputImage: CGImage
var outputPixelWidth = Int(cropWidth)
var outputPixelHeight = Int(cropHeight)
if minOutputWidth > 0 && cropWidth < minOutputWidth {
    let scale = minOutputWidth / cropWidth
    outputPixelWidth = Int(ceil(cropWidth * scale))
    outputPixelHeight = Int(ceil(cropHeight * scale))
    guard let context = CGContext(
        data: nil,
        width: outputPixelWidth,
        height: outputPixelHeight,
        bitsPerComponent: cropped.bitsPerComponent,
        bytesPerRow: 0,
        space: cropped.colorSpace ?? CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
        fail("could not create scale context")
    }
    context.interpolationQuality = .high
    context.draw(cropped, in: CGRect(x: 0, y: 0, width: outputPixelWidth, height: outputPixelHeight))
    guard let scaled = context.makeImage() else {
        fail("could not scale crop")
    }
    outputImage = scaled
} else {
    outputImage = cropped
}

let outputUrl = URL(fileURLWithPath: outputPath)
try? FileManager.default.createDirectory(at: outputUrl.deletingLastPathComponent(), withIntermediateDirectories: true)
let type = "public.png" as CFString
guard let destination = CGImageDestinationCreateWithURL(outputUrl as CFURL, type, 1, nil) else {
    fail("could not create output image at \(outputPath)")
}

CGImageDestinationAddImage(destination, outputImage, nil)
guard CGImageDestinationFinalize(destination) else {
    fail("could not write output image at \(outputPath)")
}

let result: [String: Any] = [
    "image_path": imagePath,
    "output_path": outputPath,
    "crop": [
        "x": paddedX,
        "y": paddedY,
        "width": paddedWidth,
        "height": paddedHeight
    ],
    "pixels": [
        "x": Int(cropX),
        "y": Int(cropY),
        "width": Int(cropWidth),
        "height": Int(cropHeight)
    ],
    "output_pixels": [
        "width": outputPixelWidth,
        "height": outputPixelHeight
    ]
]

let data = try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
FileHandle.standardOutput.write(data)
FileHandle.standardOutput.write("\n".data(using: .utf8)!)
