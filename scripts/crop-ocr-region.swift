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
    fail("usage: swift scripts/crop-ocr-region.swift IMAGE_PATH OUTPUT_PATH X Y WIDTH HEIGHT [PADDING] [MIN_OUTPUT_WIDTH] [ROTATION_DEGREES]")
}

let imagePath = CommandLine.arguments[1]
let outputPath = CommandLine.arguments[2]
let x = number(CommandLine.arguments[3], "x")
let y = number(CommandLine.arguments[4], "y")
let width = number(CommandLine.arguments[5], "width")
let height = number(CommandLine.arguments[6], "height")
let padding = CommandLine.arguments.count >= 8 ? max(0, number(CommandLine.arguments[7], "padding")) : 0.04
let minOutputWidth = CommandLine.arguments.count >= 9 ? max(0, number(CommandLine.arguments[8], "min output width")) : 0
let rotationInput = CommandLine.arguments.count >= 10 ? number(CommandLine.arguments[9], "rotation degrees") : 0

func normalizedRightAngle(_ degrees: Double) -> Int {
    let quarterTurns = (degrees / 90.0).rounded()
    guard abs((quarterTurns * 90.0) - degrees) < 0.001 else {
        fail("rotation degrees must be a multiple of 90: \(degrees)")
    }
    let raw = Int(quarterTurns) * 90
    return ((raw % 360) + 360) % 360
}

func rotateRightAngle(_ image: CGImage, degrees: Int) -> CGImage {
    if degrees == 0 {
        return image
    }

    let swapsAxes = degrees == 90 || degrees == 270
    let rotatedWidth = swapsAxes ? image.height : image.width
    let rotatedHeight = swapsAxes ? image.width : image.height
    let colorSpace = image.colorSpace ?? CGColorSpaceCreateDeviceRGB()
    guard let context = CGContext(
        data: nil,
        width: rotatedWidth,
        height: rotatedHeight,
        bitsPerComponent: 8,
        bytesPerRow: 0,
        space: colorSpace,
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    ) else {
        fail("could not create rotation context")
    }

    context.interpolationQuality = .high
    switch degrees {
    case 90:
        context.translateBy(x: CGFloat(rotatedWidth), y: 0)
        context.rotate(by: .pi / 2)
    case 180:
        context.translateBy(x: CGFloat(rotatedWidth), y: CGFloat(rotatedHeight))
        context.rotate(by: .pi)
    case 270:
        context.translateBy(x: 0, y: CGFloat(rotatedHeight))
        context.rotate(by: -.pi / 2)
    default:
        fail("unsupported rotation degrees: \(degrees)")
    }
    context.draw(image, in: CGRect(x: 0, y: 0, width: image.width, height: image.height))

    guard let rotated = context.makeImage() else {
        fail("could not rotate crop")
    }
    return rotated
}

let rotationDegrees = normalizedRightAngle(rotationInput)

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

let finalImage = rotateRightAngle(outputImage, degrees: rotationDegrees)
outputPixelWidth = finalImage.width
outputPixelHeight = finalImage.height

let outputUrl = URL(fileURLWithPath: outputPath)
try? FileManager.default.createDirectory(at: outputUrl.deletingLastPathComponent(), withIntermediateDirectories: true)
let type = "public.png" as CFString
guard let destination = CGImageDestinationCreateWithURL(outputUrl as CFURL, type, 1, nil) else {
    fail("could not create output image at \(outputPath)")
}

CGImageDestinationAddImage(destination, finalImage, nil)
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
    ],
    "rotation_degrees": rotationDegrees
]

let data = try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
FileHandle.standardOutput.write(data)
FileHandle.standardOutput.write("\n".data(using: .utf8)!)
