export type TranscriptCallback = (transcript: string) => void
export type VoiceErrorCallback = (message: string) => void

/** Stage-independent voice boundary. A real AsrModule service is deferred. */
export interface VoiceInputService {
  readonly serviceName: string
  readonly selectedTranscript: string
  readonly availableTranscripts: ReadonlyArray<string>
  selectNextTranscript(): string
  startListening(onTranscript: TranscriptCallback, onError: VoiceErrorCallback): void
  cancel(): void
  update(deltaTime: number): void
}
