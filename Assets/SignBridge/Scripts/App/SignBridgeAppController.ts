import {AppState, AppStateMachine} from "./AppState"
import {MockVoiceInputService} from "../Voice/MockVoiceInputService"
import {VoiceInputService} from "../Voice/VoiceInputService"
import {PhraseResolver} from "../Translation/PhraseResolver"
import {formatToken, SignSequence, TranslationResult} from "../Translation/SignTypes"
import {runPhraseResolverTests} from "../Translation/PhraseResolverTests"
import {PlaybackMode, TokenPlayer} from "../Playback/TokenPlayer"
import {WristAnchorController} from "../Tracking/WristAnchorController"
import {SignBridgeStage1UI} from "../UI/SignBridgeStage1UI"

@component
export class SignBridgeAppController extends BaseScriptComponent {
  @input("vec3", "{-3.2,4.0,2.0}")
  @hint("Local wrist-space offset in centimeters for the Speak control")
  public wristLocalOffset: vec3 = new vec3(-3.2, 4.0, 2.0)

  @input("float", "12")
  @hint("Exponential position/rotation smoothing rate")
  public wristSmoothingRate: number = 12

  @input("float", "56")
  @hint("View-relative fallback distance in centimeters")
  public fallbackDistance: number = 56

  private initialized = false
  private stateMachine!: AppStateMachine
  private voice!: VoiceInputService
  private resolver!: PhraseResolver
  private player!: TokenPlayer
  private wristAnchor!: WristAnchorController
  private ui!: SignBridgeStage1UI

  private selectedMode = PlaybackMode.Quick
  private selectedSpeed = 0.75
  private recognizedTranscript = ""
  private currentSequence: SignSequence | null = null
  private lastResolverResult = ""
  private lastInteractionSource = ""
  private lastError = ""
  private resolutionCountdown = -1
  private debugRefreshCountdown = 0

  public onAwake(): void {
    this.createEvent("OnStartEvent").bind(() => this.initialize())
    this.createEvent("UpdateEvent").bind(() => this.update())
  }

  private initialize(): void {
    if (this.initialized) return

    this.voice = new MockVoiceInputService()
    this.resolver = new PhraseResolver()
    this.stateMachine = new AppStateMachine((previous, current) => this.onStateChanged(previous, current))
    this.player = new TokenPlayer({
      onTokenChanged: () => this.syncPlayerUI(false),
      onCompleted: () => this.onPlaybackCompleted()
    })

    const wristContainer = this.requireContainer("WristUI")
    const experienceContainer = this.requireContainer("ExperienceUI")
    const playbackContainer = this.requireContainer("Playback")
    const debugContainer = this.requireContainer("Debug")

    this.ui = new SignBridgeStage1UI(
      {
        wrist: wristContainer,
        experience: experienceContainer,
        playback: playbackContainer,
        debug: debugContainer
      },
      {
        onSpeak: () => this.startListening(),
        onCycleMock: () => this.cycleMock(),
        onToggleMode: () => this.toggleMode(),
        onConfirm: () => this.confirmTranscript(),
        onTryAgain: () => this.startListening(),
        onCancel: () => this.returnToIdle(),
        onPrevious: () => this.previousToken(),
        onReplay: () => this.replaySequence(),
        onPauseResume: () => this.pauseResume(),
        onNext: () => this.nextToken(),
        onCycleSpeed: () => this.cycleSpeed(),
        onExit: () => this.returnToIdle(),
        onForceFallback: () => this.toggleForcedFallback(),
        onInteractionSource: (source) => this.recordInteractionSource(source)
      }
    )

    this.wristAnchor = new WristAnchorController({
      target: this.ui.wristTarget,
      localOffset: this.wristLocalOffset,
      smoothingRate: this.wristSmoothingRate,
      fallbackDistance: this.fallbackDistance,
      fallbackOffset: new vec2(-14, -12)
    })

    this.ui.setSelectedMock(this.voice.selectedTranscript)
    this.ui.setMode(this.selectedMode, this.selectedSpeed)
    this.ui.setFallbackForced(false)
    this.ui.setState(this.stateMachine.current)
    this.runResolverSuite()
    this.initialized = true
    print("[SignBridge] Stage 1 initialized — mock voice and placeholder tokens only")
  }

  private update(): void {
    if (!this.initialized) return

    const deltaTime = getDeltaTime()
    this.voice.update(deltaTime)
    this.player.update(deltaTime)
    this.wristAnchor.update(deltaTime)

    if (this.resolutionCountdown >= 0) {
      this.resolutionCountdown -= deltaTime
      if (this.resolutionCountdown <= 0) {
        this.resolutionCountdown = -1
        this.resolveConfirmedTranscript()
      }
    }

    this.debugRefreshCountdown -= deltaTime
    if (this.debugRefreshCountdown <= 0) {
      this.debugRefreshCountdown = 0.15
      this.refreshDebugPanel()
    }
  }

  private startListening(): void {
    const state = this.stateMachine.current
    if (
      state !== AppState.Idle &&
      state !== AppState.Review &&
      state !== AppState.Unsupported &&
      state !== AppState.Error
    ) {
      this.rejectAction(`Listen is unavailable while state is ${state}`)
      return
    }

    this.player.stop()
    this.currentSequence = null
    this.recognizedTranscript = ""
    this.lastResolverResult = ""
    this.resolutionCountdown = -1
    if (!this.transition(AppState.Listening)) return

    this.voice.startListening(
      (transcript) => this.onTranscriptRecognized(transcript),
      (message) => this.enterError(message)
    )
  }

  private onTranscriptRecognized(transcript: string): void {
    if (this.stateMachine.current !== AppState.Listening) return
    this.recognizedTranscript = transcript
    this.ui.setReviewTranscript(transcript)
    print(`[SignBridge][Voice] Mock transcript: ${transcript}`)
    this.transition(AppState.Review)
  }

  private confirmTranscript(): void {
    if (this.stateMachine.current !== AppState.Review) {
      this.rejectAction(`Confirm is unavailable while state is ${this.stateMachine.current}`)
      return
    }
    if (!this.transition(AppState.Resolving)) return
    this.resolutionCountdown = 0.18
  }

  private resolveConfirmedTranscript(): void {
    if (this.stateMachine.current !== AppState.Resolving) return

    const result = this.resolver.resolve(this.recognizedTranscript)
    this.lastResolverResult = this.describeResult(result)
    print(`[SignBridge][Resolver] ${this.recognizedTranscript} => ${this.lastResolverResult}`)

    if (result.kind !== "Sequence" || !result.sequence) {
      this.currentSequence = null
      this.ui.setUnsupportedMessage(result.message ?? "Unable to resolve this input.")
      this.transition(AppState.Unsupported)
      return
    }

    this.currentSequence = result.sequence
    const playbackState =
      this.selectedMode === PlaybackMode.Quick ? AppState.Demonstrating : AppState.GuidedPractice
    if (!this.transition(playbackState)) return
    this.player.load(result.sequence, this.selectedMode, this.selectedSpeed)
  }

  private cycleMock(): void {
    if (this.stateMachine.current !== AppState.Idle) {
      this.rejectAction(`Mock selection is unavailable while state is ${this.stateMachine.current}`)
      return
    }
    this.ui.setSelectedMock(this.voice.selectNextTranscript())
    this.refreshDebugPanel()
  }

  private toggleMode(): void {
    if (this.stateMachine.current !== AppState.Idle) {
      this.rejectAction(`Mode selection is unavailable while state is ${this.stateMachine.current}`)
      return
    }
    this.selectedMode =
      this.selectedMode === PlaybackMode.Quick ? PlaybackMode.Guided : PlaybackMode.Quick
    this.ui.setMode(this.selectedMode, this.selectedSpeed)
    print(`[SignBridge] Communication mode: ${this.selectedMode}`)
  }

  private previousToken(): void {
    if (!this.isPlaybackState(true)) return
    this.resumePlaybackStateIfCompleted()
    this.player.previous()
  }

  private replaySequence(): void {
    if (!this.isPlaybackState(true)) return
    this.resumePlaybackStateIfCompleted()
    this.player.replay()
  }

  private pauseResume(): void {
    if (!this.isPlaybackState(true)) return
    if (this.stateMachine.current === AppState.Completed) {
      this.resumePlaybackStateIfCompleted()
      this.player.replay()
      return
    }
    this.player.togglePause()
  }

  private nextToken(): void {
    if (!this.isPlaybackState(false)) return
    this.player.next()
  }

  private cycleSpeed(): void {
    if (!this.isPlaybackState(true)) return
    this.selectedSpeed = this.player.cycleSpeed()
    this.ui.setMode(this.selectedMode, this.selectedSpeed)
  }

  private onPlaybackCompleted(): void {
    if (
      this.stateMachine.current !== AppState.Demonstrating &&
      this.stateMachine.current !== AppState.GuidedPractice
    ) {
      return
    }
    this.transition(AppState.Completed)
    this.syncPlayerUI(true)
    print("[SignBridge][Playback] Sequence complete")
  }

  private syncPlayerUI(completed: boolean): void {
    if (!this.ui || !this.currentSequence) return
    this.ui.updatePlayer(
      this.currentSequence.originalTranscript,
      this.player.currentToken,
      this.player.currentIndex,
      this.player.tokenCount,
      this.player.currentMode,
      this.player.isPaused,
      this.player.speed,
      completed || this.stateMachine.current === AppState.Completed
    )
  }

  private returnToIdle(): void {
    this.voice.cancel()
    this.player.stop()
    this.resolutionCountdown = -1
    this.currentSequence = null
    this.recognizedTranscript = ""
    this.lastResolverResult = ""
    this.lastError = ""

    if (this.stateMachine.current !== AppState.Idle) {
      this.transition(AppState.Idle)
    } else {
      this.ui.setState(AppState.Idle)
    }
    this.ui.setSelectedMock(this.voice.selectedTranscript)
  }

  private toggleForcedFallback(): void {
    this.wristAnchor.setForceFallback(!this.wristAnchor.isForceFallback)
    this.ui.setFallbackForced(this.wristAnchor.isForceFallback)
    print(`[SignBridge][Tracking] ${this.wristAnchor.placementMode}`)
  }

  private recordInteractionSource(source: string): void {
    this.lastInteractionSource = source
    this.refreshDebugPanel()
    print(`[SignBridge][Interaction] ${source}`)
  }

  private enterError(message: string): void {
    this.lastError = message
    this.ui.setError(message)
    if (this.stateMachine.current !== AppState.Error) {
      this.transition(AppState.Error)
    }
    print(`[SignBridge][Error] ${message}`)
  }

  private transition(next: AppState): boolean {
    if (this.stateMachine.transition(next)) return true
    this.rejectAction(`Invalid state transition ${this.stateMachine.current} -> ${next}`)
    return false
  }

  private onStateChanged(previous: AppState, current: AppState): void {
    this.ui?.setState(current)
    this.refreshDebugPanel()
    print(`[SignBridge][State] ${previous} -> ${current}`)
  }

  private rejectAction(message: string): void {
    this.lastError = message
    print(`[SignBridge][Guard] ${message}`)
    this.refreshDebugPanel()
  }

  private isPlaybackState(allowCompleted: boolean): boolean {
    const state = this.stateMachine.current
    const valid =
      state === AppState.Demonstrating ||
      state === AppState.GuidedPractice ||
      (allowCompleted && state === AppState.Completed)
    if (!valid) this.rejectAction(`Playback control is unavailable while state is ${state}`)
    return valid
  }

  private resumePlaybackStateIfCompleted(): void {
    if (this.stateMachine.current !== AppState.Completed) return
    const state = this.selectedMode === PlaybackMode.Quick ? AppState.Demonstrating : AppState.GuidedPractice
    this.transition(state)
  }

  private describeResult(result: TranslationResult): string {
    if (!result.sequence) return result.message ?? result.kind
    return result.sequence.tokens.map(formatToken).join(" | ")
  }

  private refreshDebugPanel(): void {
    if (!this.initialized && !this.ui) return
    this.ui.updateDebug({
      state: this.stateMachine.current,
      selectedTranscript: this.voice.selectedTranscript,
      resolverResult: this.lastResolverResult,
      tokenIndex: this.player.currentIndex,
      tokenCount: this.player.tokenCount,
      wristTracking: this.wristAnchor?.isTrackingAvailable ?? false,
      wristPlacement: this.wristAnchor?.placementMode ?? "initializing",
      interactionSource: this.lastInteractionSource,
      lastError: this.lastError
    })
  }

  private runResolverSuite(): void {
    const report = runPhraseResolverTests()
    if (report.failed === 0) {
      print(`[SignBridge][Tests] PASS ${report.passed}/${report.passed} deterministic resolver checks`)
      return
    }

    this.lastError = `${report.failed} resolver checks failed: ${report.failures.join("; ")}`
    print(`[SignBridge][Tests] FAIL ${report.failed}: ${report.failures.join("; ")}`)
  }

  private requireContainer(name: string): SceneObject {
    for (const child of this.sceneObject.children) {
      if (child.name === name) return child
    }

    // Defensive runtime fallback only. The authored scene is expected to
    // contain these containers, and final hierarchy tests verify it does.
    const child = global.scene.createSceneObject(name)
    child.setParent(this.sceneObject)
    child.layer = this.sceneObject.layer
    print(`[SignBridge][Warning] Authored container ${name} was missing; created runtime fallback`)
    return child
  }
}
