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

struct RecognizedPayload {
    let processor: String
    let observations: [VNRecognizedTextObservation]
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

func makeRequest(level: VNRequestTextRecognitionLevel, languageCorrection: Bool, languages: [String], minimumTextHeight: Float, revision: Int?) -> (VNRecognizeTextRequest, () -> Error?) {
    var recognitionError: Error?
    let request = VNRecognizeTextRequest { _, error in
        recognitionError = error
    }
    request.recognitionLevel = level
    request.usesLanguageCorrection = languageCorrection
    if !languages.isEmpty {
        request.recognitionLanguages = languages
    }
    request.minimumTextHeight = minimumTextHeight
    if let revision {
        request.revision = revision
    }
    return (request, { recognitionError })
}

func recognizeText() -> (payload: RecognizedPayload?, error: String) {
    var attempts: [(String, VNRequestTextRecognitionLevel, Bool, [String], Float, Int?, Bool)] = [
        ("vision_text_recognition_accurate_default", .accurate, false, [], 0.006, nil, false),
        ("vision_text_recognition_accurate_en", .accurate, true, ["en-US"], 0.006, nil, false),
        ("vision_text_recognition_fast_default", .fast, false, [], 0.004, nil, false),
        ("vision_text_recognition_url_default", .accurate, false, [], 0.006, nil, true),
    ]
    if #available(macOS 13.0, *) {
        attempts.insert(("vision_text_recognition_revision3_default", .accurate, false, [], 0.006, VNRecognizeTextRequestRevision3, false), at: 0)
    }

    var errors: [String] = []
    var emptySuccess: RecognizedPayload?

    for (name, level, correction, languages, minimumHeight, revision, useUrlHandler) in attempts {
        let (request, requestError) = makeRequest(
            level: level,
            languageCorrection: correction,
            languages: languages,
            minimumTextHeight: minimumHeight,
            revision: revision
        )
        do {
            if useUrlHandler {
                let handler = VNImageRequestHandler(url: imageUrl, options: [:])
                try handler.perform([request])
            } else {
                let handler = VNImageRequestHandler(cgImage: image, options: [:])
                try handler.perform([request])
            }
        } catch {
            errors.append("\(name): \(error)")
            continue
        }
        if let error = requestError() {
            errors.append("\(name): \(error)")
            continue
        }
        let payload = RecognizedPayload(processor: name, observations: request.results ?? [])
        if !payload.observations.isEmpty {
            return (payload, "")
        }
        if emptySuccess == nil {
            emptySuccess = payload
        }
    }

    if let emptySuccess {
        return (emptySuccess, "")
    }
    return (nil, errors.joined(separator: "; "))
}

let result = recognizeText()
guard let recognized = result.payload else {
    fail("vision text recognition failed for \(imagePath): \(result.error)")
}

let observations = recognized.observations
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
    processor: recognized.processor,
    imagePath: imagePath,
    lines: lines
)
let encoder = JSONEncoder()
encoder.outputFormatting = [.sortedKeys]
let data = try encoder.encode(output)
FileHandle.standardOutput.write(data)
FileHandle.standardOutput.write("\n".data(using: .utf8)!)
