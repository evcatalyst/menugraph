import Foundation
import Vision
import ImageIO

struct BoundingBox: Codable {
    let x: Double
    let y: Double
    let width: Double
    let height: Double
}

struct OcrLine: Codable {
    let text: String
    let confidence: Double
    let bbox: BoundingBox
}

struct OcrOutput: Codable {
    let version: Int
    let processor: String
    let imagePath: String
    let lines: [OcrLine]
}

func fail(_ message: String) -> Never {
    FileHandle.standardError.write((message + "\n").data(using: .utf8)!)
    exit(1)
}

guard CommandLine.arguments.count >= 2 else {
    fail("usage: swift scripts/vision-ocr.swift IMAGE_PATH")
}

let imagePath = CommandLine.arguments[1]
let imageUrl = URL(fileURLWithPath: imagePath)
guard let source = CGImageSourceCreateWithURL(imageUrl as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    fail("could not read image at \(imagePath)")
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true
request.minimumTextHeight = 0.008
if #available(macOS 13.0, *) {
    request.revision = VNRecognizeTextRequestRevision3
}

let handler = VNImageRequestHandler(cgImage: image, options: [:])
do {
    try handler.perform([request])
} catch {
    fail("vision text recognition failed for \(imagePath): \(error)")
}

let observations = request.results ?? []
let lines = observations.compactMap { observation -> OcrLine? in
    guard let candidate = observation.topCandidates(1).first else { return nil }
    let text = candidate.string.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !text.isEmpty else { return nil }
    let box = observation.boundingBox
    return OcrLine(
        text: text,
        confidence: Double(candidate.confidence),
        bbox: BoundingBox(
            x: Double(box.origin.x),
            y: Double(box.origin.y),
            width: Double(box.size.width),
            height: Double(box.size.height)
        )
    )
}
.sorted {
    if abs($0.bbox.y - $1.bbox.y) > 0.015 {
        return $0.bbox.y > $1.bbox.y
    }
    return $0.bbox.x < $1.bbox.x
}

let output = OcrOutput(
    version: 1,
    processor: "macos_vision_text_recognition",
    imagePath: imagePath,
    lines: lines
)
let encoder = JSONEncoder()
encoder.outputFormatting = [.sortedKeys]
let data = try encoder.encode(output)
FileHandle.standardOutput.write(data)
FileHandle.standardOutput.write("\n".data(using: .utf8)!)
