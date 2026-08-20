import {TranscriptCallback, VoiceErrorCallback, VoiceInputService} from "./VoiceInputService"

const MOCK_TRANSCRIPTS: ReadonlyArray<string> = [
  "My name is Kaustubh",
  "Hello",
  "Nova",
  "Can you tell me where the railway station is?"
]

/** Preview-only deterministic stand-in for the Stage 2 AsrModule service. */
export class MockVoiceInputService implements VoiceInputService {
  public readonly serviceName = "MockVoiceInputService (Preview)"
  public readonly availableTranscripts = MOCK_TRANSCRIPTS

  private selectedIndex = 0
  private remainingSeconds = -1
  private successCallback: TranscriptCallback | null = null
  private errorCallback: VoiceErrorCallback | null = null

  public get selectedTranscript(): string {
    return this.availableTranscripts[this.selectedIndex]
  }

  public selectNextTranscript(): string {
    this.selectedIndex = (this.selectedIndex + 1) % this.availableTranscripts.length
    return this.selectedTranscript
  }

  public startListening(onTranscript: TranscriptCallback, onError: VoiceErrorCallback): void {
    this.cancel()
    this.successCallback = onTranscript
    this.errorCallback = onError
    this.remainingSeconds = 0.55
  }

  public cancel(): void {
    this.remainingSeconds = -1
    this.successCallback = null
    this.errorCallback = null
  }

  public update(deltaTime: number): void {
    if (this.remainingSeconds < 0) {
      return
    }

    this.remainingSeconds -= deltaTime
    if (this.remainingSeconds > 0) {
      return
    }

    const callback = this.successCallback
    const errorCallback = this.errorCallback
    const transcript = this.selectedTranscript
    this.cancel()
    if (callback) {
      callback(transcript)
    } else {
      errorCallback?.("Mock voice callback was unavailable.")
    }
  }
}
