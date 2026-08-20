// Preload the theme service before constructing custom UIKit visuals.
import "SpectaclesUIKit.lspkg/Scripts/Themes/ThemeService"
import {
  InteractorInputType,
  InteractorTriggerType
} from "SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor"
import {Button} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/Button"
import {ElementContent} from "SpectaclesUIKit.lspkg/Scripts/Components/Content/ElementContent"
import {StateName} from "SpectaclesUIKit.lspkg/Scripts/Components/Element"
import {
  RoundedRectBlendMode,
  RoundedRectangle
} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle"
import {
  RoundedRectangleVisual,
  RoundedRectangleVisualState
} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangleVisual"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {AppState} from "../App/AppState"
import {PlaybackMode} from "../Playback/TokenPlayer"
import {SignToken, formatToken} from "../Translation/SignTypes"

const COLORS = {
  charcoal: new vec4(0.035, 0.055, 0.07, 0.92),
  charcoalLight: new vec4(0.08, 0.105, 0.125, 0.9),
  cyan: new vec4(0.1, 0.9, 1.0, 1.0),
  white: new vec4(1, 1, 1, 1),
  muted: new vec4(0.76, 0.82, 0.86, 1),
  green: new vec4(0.18, 0.92, 0.55, 1),
  amber: new vec4(1.0, 0.68, 0.16, 1),
  red: new vec4(1.0, 0.25, 0.3, 1)
}

const Z_BACKGROUND = 0
const Z_CONTROL = 0.45
const Z_TEXT = 0.72
const BUTTON_TEXT_SIZE = 38

function flatGradient(color: vec4) {
  return {
    enabled: true,
    type: "Rectangle" as const,
    stop0: {enabled: true, percent: 0, color},
    stop1: {enabled: true, percent: 0.5, color},
    stop2: {enabled: true, percent: 1, color},
    stop3: {enabled: true, percent: 1, color}
  }
}

function buttonStyle(style: string): Partial<Record<StateName, RoundedRectangleVisualState>> {
  const isPrimary = style === "Primary"
  const isGhost = style === "Ghost"
  const base = isPrimary
    ? new vec4(0.025, 0.38, 0.48, 1)
    : isGhost
      ? new vec4(0.04, 0.065, 0.08, 0.72)
      : new vec4(0.095, 0.13, 0.155, 0.96)
  const hovered = isPrimary
    ? new vec4(0.035, 0.62, 0.75, 1)
    : new vec4(0.12, 0.22, 0.27, 1)
  const triggered = isPrimary
    ? new vec4(0.08, 0.82, 0.93, 1)
    : new vec4(0.08, 0.32, 0.39, 1)
  const border = isPrimary ? COLORS.cyan : new vec4(0.24, 0.48, 0.55, 1)
  const state = (color: vec4): RoundedRectangleVisualState => ({
    baseType: "Gradient",
    baseGradient: flatGradient(color),
    hasBorder: true,
    borderSize: 0.13,
    borderType: "Color",
    borderColor: border
  })
  return {
    default: state(base),
    hovered: state(hovered),
    triggered: state(triggered),
    inactive: state(new vec4(0.07, 0.085, 0.095, 0.82))
  }
}

export interface SignBridgeUIContainers {
  wrist: SceneObject
  experience: SceneObject
  playback: SceneObject
  debug: SceneObject
}

export interface SignBridgeUICallbacks {
  onSpeak: () => void
  onCycleMock: () => void
  onToggleMode: () => void
  onConfirm: () => void
  onTryAgain: () => void
  onCancel: () => void
  onPrevious: () => void
  onReplay: () => void
  onPauseResume: () => void
  onNext: () => void
  onCycleSpeed: () => void
  onExit: () => void
  onForceFallback: () => void
  onInteractionSource: (source: string) => void
}

export interface DebugPanelData {
  state: AppState
  selectedTranscript: string
  resolverResult: string
  tokenIndex: number
  tokenCount: number
  wristTracking: boolean
  wristPlacement: string
  interactionSource: string
  lastError: string
}

interface ButtonRef {
  root: SceneObject
  button: Button
  content: ElementContent
}

export class SignBridgeStage1UI {
  private readonly camera = WorldCameraFinderProvider.getInstance()

  private mainPanel!: SceneObject
  private reviewPanel!: SceneObject
  private playerPanel!: SceneObject
  private unsupportedPanel!: SceneObject
  private errorPanel!: SceneObject
  private debugPanel!: SceneObject

  private speakButton!: ButtonRef
  private mockButton!: ButtonRef
  private modeButton!: ButtonRef
  private pauseButton!: ButtonRef
  private speedButton!: ButtonRef
  private fallbackButton!: ButtonRef

  private mainStateText!: Text
  private selectedMockText!: Text
  private reviewTranscriptText!: Text
  private playerTranscriptText!: Text
  private playerTokenText!: Text
  private playerTypeText!: Text
  private playerProgressText!: Text
  private guidedStatusText!: Text
  private completionText!: Text
  private unsupportedText!: Text
  private errorText!: Text
  private debugText!: Text

  private debugVisible = false

  constructor(
    private readonly containers: SignBridgeUIContainers,
    private readonly callbacks: SignBridgeUICallbacks
  ) {
    this.placeViewRelative(containers.experience, 72, new vec2(0, -1))
    this.placeViewRelative(containers.playback, 72, new vec2(0, -1))
    this.placeViewRelative(containers.debug, 72, new vec2(29, 1))
    this.buildMainPanel()
    this.buildReviewPanel()
    this.buildPlayerPanel()
    this.buildUnsupportedPanel()
    this.buildErrorPanel()
    this.buildWristButton()
    this.buildDebugPanel()
    this.buildDebugToggle()
    this.setState(AppState.Idle)
    this.setDebugVisible(false)
  }

  public get wristTarget(): SceneObject {
    return this.containers.wrist
  }

  public setState(state: AppState): void {
    this.mainPanel.enabled =
      state === AppState.Idle || state === AppState.Listening || state === AppState.Resolving
    this.reviewPanel.enabled = state === AppState.Review
    this.playerPanel.enabled =
      state === AppState.Demonstrating || state === AppState.GuidedPractice || state === AppState.Completed
    this.unsupportedPanel.enabled = state === AppState.Unsupported
    this.errorPanel.enabled = state === AppState.Error

    const showSpeak =
      state === AppState.Idle || state === AppState.Listening || state === AppState.Resolving || state === AppState.Error
    this.containers.wrist.enabled = showSpeak
    this.speakButton.button.inactive = state !== AppState.Idle
    this.mockButton.button.inactive = state !== AppState.Idle
    this.modeButton.button.inactive = state !== AppState.Idle

    switch (state) {
      case AppState.Idle:
        this.speakButton.content.text = "Speak"
        this.mainStateText.text = "Ready — select a mock transcript, then pinch or click Speak"
        break
      case AppState.Listening:
        this.speakButton.content.text = "Listening…"
        this.mainStateText.text = "Mock speech capture in progress"
        break
      case AppState.Resolving:
        this.speakButton.content.text = "Processing…"
        this.mainStateText.text = "Resolving within the curated phrase boundary"
        break
      case AppState.Error:
        this.speakButton.content.text = "Error"
        break
      default:
        break
    }
  }

  public setSelectedMock(transcript: string): void {
    this.selectedMockText.text = `“${transcript}”`
    this.mockButton.content.text = "Next mock"
  }

  public setMode(mode: PlaybackMode, speed: number): void {
    this.modeButton.content.text = mode === PlaybackMode.Quick ? "Quick mode" : "Guided mode"
    this.speedButton.content.text = `${speed.toFixed(2)}x`
  }

  public setReviewTranscript(transcript: string): void {
    this.reviewTranscriptText.text = `“${transcript}”`
  }

  public setUnsupportedMessage(message: string): void {
    this.unsupportedText.text = message
  }

  public setError(message: string): void {
    this.errorText.text = message
  }

  public updatePlayer(
    transcript: string,
    token: SignToken | null,
    index: number,
    count: number,
    mode: PlaybackMode,
    paused: boolean,
    speed: number,
    completed: boolean
  ): void {
    this.playerTranscriptText.text = `Confirmed: “${transcript}”`
    this.playerTokenText.text = token ? formatToken(token) : "No token"
    this.playerTypeText.text = token
      ? `Token type: ${token.type === "Phrase" ? "Phrase" : "Fingerspelling"}`
      : "Token type: —"
    this.playerProgressText.text = count > 0 ? `Progress ${index + 1}/${count}  •  ${mode}` : "Progress —"

    if (!token) {
      this.guidedStatusText.text = ""
    } else if (mode === PlaybackMode.Guided && token.guidedScoring === "FutureMLTarget") {
      this.guidedStatusText.text = "Future ML-scored target"
      this.guidedStatusText.textFill.color = COLORS.amber
    } else if (mode === PlaybackMode.Guided) {
      this.guidedStatusText.text = "Demonstration only — not currently scored"
      this.guidedStatusText.textFill.color = COLORS.muted
    } else {
      this.guidedStatusText.text = "Quick Mode — semantic token autoplay"
      this.guidedStatusText.textFill.color = COLORS.muted
    }

    this.pauseButton.content.text = paused ? "Resume" : "Pause"
    this.speedButton.content.text = `${speed.toFixed(2)}x`
    this.completionText.text = completed ? "Sequence complete" : ""
  }

  public updateDebug(data: DebugPanelData): void {
    const tokenDisplay = data.tokenCount > 0 ? `${data.tokenIndex + 1}/${data.tokenCount}` : "—"
    this.debugText.text =
      `State: ${data.state}\n` +
      `Mock: ${data.selectedTranscript}\n` +
      `Resolver: ${data.resolverResult || "—"}\n` +
      `Token: ${tokenDisplay}\n` +
      `Wrist tracked: ${data.wristTracking ? "yes" : "no"}\n` +
      `Placement: ${data.wristPlacement}\n` +
      `Interaction: ${data.interactionSource || "none"}\n` +
      `Last error: ${data.lastError || "none"}`
  }

  public setFallbackForced(forced: boolean): void {
    this.fallbackButton.content.text = forced ? "Fallback: FORCED" : "Fallback: AUTO"
  }

  private buildMainPanel(): void {
    this.mainPanel = this.createPanel(this.containers.experience, "IdlePanel", new vec2(34, 23))
    this.createText(this.mainPanel, "Title", "SignBridge AR", new vec3(0, 8.7, Z_TEXT), new vec2(30, 3), 72, COLORS.white)
    this.createText(
      this.mainPanel,
      "Boundary",
      "Curated phrases + fingerspelling only",
      new vec3(0, 5.8, Z_TEXT),
      new vec2(30, 2.4),
      38,
      COLORS.cyan
    )
    this.mainStateText = this.createText(
      this.mainPanel,
      "State",
      "Ready",
      new vec3(0, 2.9, Z_TEXT),
      new vec2(30, 2.7),
      34,
      COLORS.muted
    )
    this.createText(
      this.mainPanel,
      "MockLabel",
      "Preview mock transcript",
      new vec3(0, 0.2, Z_TEXT),
      new vec2(29, 2),
      30,
      COLORS.muted
    )
    this.selectedMockText = this.createText(
      this.mainPanel,
      "SelectedMock",
      "",
      new vec3(0, -2.6, Z_TEXT),
      new vec2(29, 3.2),
      38,
      COLORS.white
    )
    this.mockButton = this.createButton(
      this.mainPanel,
      "NextMockButton",
      "Next mock",
      new vec3(-7.2, -7.0, Z_CONTROL),
      new vec2(12.2, 3.4),
      "Secondary",
      this.callbacks.onCycleMock
    )
    this.modeButton = this.createButton(
      this.mainPanel,
      "ModeButton",
      "Quick mode",
      new vec3(7.2, -7.0, Z_CONTROL),
      new vec2(12.2, 3.4),
      "Primary",
      this.callbacks.onToggleMode
    )
    this.createText(
      this.mainPanel,
      "SpeakHint",
      "Use the wrist control below • pinch or Preview mouse",
      new vec3(0, -10.0, Z_TEXT),
      new vec2(30, 2),
      29,
      COLORS.muted
    )
  }

  private buildReviewPanel(): void {
    this.reviewPanel = this.createPanel(this.containers.experience, "ReviewPanel", new vec2(35, 20))
    this.createText(
      this.reviewPanel,
      "ReviewTitle",
      "Review transcription",
      new vec3(0, 6.7, Z_TEXT),
      new vec2(30, 3),
      60,
      COLORS.white
    )
    this.createText(
      this.reviewPanel,
      "ReviewPrompt",
      "Recognized transcript",
      new vec3(0, 3.5, Z_TEXT),
      new vec2(30, 2),
      31,
      COLORS.cyan
    )
    this.reviewTranscriptText = this.createText(
      this.reviewPanel,
      "ReviewTranscript",
      "",
      new vec3(0, 0.3, Z_TEXT),
      new vec2(31, 4.2),
      45,
      COLORS.white
    )
    this.createButton(
      this.reviewPanel,
      "ConfirmButton",
      "Confirm",
      new vec3(-10.2, -6.1, Z_CONTROL),
      new vec2(8.4, 3.5),
      "Primary",
      this.callbacks.onConfirm
    )
    this.createButton(
      this.reviewPanel,
      "TryAgainButton",
      "Try Again",
      new vec3(0, -6.1, Z_CONTROL),
      new vec2(8.4, 3.5),
      "Secondary",
      this.callbacks.onTryAgain
    )
    this.createButton(
      this.reviewPanel,
      "CancelReviewButton",
      "Cancel",
      new vec3(10.2, -6.1, Z_CONTROL),
      new vec2(8.4, 3.5),
      "Ghost",
      this.callbacks.onCancel
    )
  }

  private buildPlayerPanel(): void {
    this.playerPanel = this.createPanel(this.containers.playback, "TokenPlayerPanel", new vec2(43, 30))
    this.createText(
      this.playerPanel,
      "PlaceholderWarning",
      "PLACEHOLDER — VERIFIED ASL ANIMATION NOT YET ATTACHED",
      new vec3(0, 12.2, Z_TEXT),
      new vec2(39, 2.5),
      34,
      COLORS.amber
    )
    this.playerTranscriptText = this.createText(
      this.playerPanel,
      "OriginalTranscript",
      "",
      new vec3(0, 9.2, Z_TEXT),
      new vec2(38, 2.5),
      32,
      COLORS.muted
    )
    this.playerTokenText = this.createText(
      this.playerPanel,
      "CurrentToken",
      "No token",
      new vec3(0, 5.3, Z_TEXT),
      new vec2(38, 4.5),
      72,
      COLORS.white
    )
    this.playerTypeText = this.createText(
      this.playerPanel,
      "TokenType",
      "Token type: —",
      new vec3(0, 2.5, Z_TEXT),
      new vec2(36, 2),
      31,
      COLORS.cyan
    )
    this.playerProgressText = this.createText(
      this.playerPanel,
      "Progress",
      "Progress —",
      new vec3(0, 0.1, Z_TEXT),
      new vec2(36, 2),
      31,
      COLORS.muted
    )
    this.guidedStatusText = this.createText(
      this.playerPanel,
      "GuidedStatus",
      "",
      new vec3(0, -2.4, Z_TEXT),
      new vec2(37, 2.3),
      31,
      COLORS.muted
    )
    this.completionText = this.createText(
      this.playerPanel,
      "Completion",
      "",
      new vec3(0, -5.0, Z_TEXT),
      new vec2(36, 2.2),
      38,
      COLORS.green
    )

    this.createButton(
      this.playerPanel,
      "PreviousButton",
      "Previous",
      new vec3(-16.3, -8.6, Z_CONTROL),
      new vec2(6.4, 3.2),
      "Secondary",
      this.callbacks.onPrevious
    )
    this.createButton(
      this.playerPanel,
      "ReplayButton",
      "Replay",
      new vec3(-8.15, -8.6, Z_CONTROL),
      new vec2(6.4, 3.2),
      "Secondary",
      this.callbacks.onReplay
    )
    this.pauseButton = this.createButton(
      this.playerPanel,
      "PauseResumeButton",
      "Pause",
      new vec3(0, -8.6, Z_CONTROL),
      new vec2(6.4, 3.2),
      "Primary",
      this.callbacks.onPauseResume
    )
    this.createButton(
      this.playerPanel,
      "NextButton",
      "Next",
      new vec3(8.15, -8.6, Z_CONTROL),
      new vec2(6.4, 3.2),
      "Secondary",
      this.callbacks.onNext
    )
    this.speedButton = this.createButton(
      this.playerPanel,
      "SpeedButton",
      "0.75x",
      new vec3(16.3, -8.6, Z_CONTROL),
      new vec2(6.4, 3.2),
      "Secondary",
      this.callbacks.onCycleSpeed
    )
    this.createButton(
      this.playerPanel,
      "ExitButton",
      "Exit to Idle",
      new vec3(0, -12.8, Z_CONTROL),
      new vec2(12, 3.1),
      "Ghost",
      this.callbacks.onExit
    )
  }

  private buildUnsupportedPanel(): void {
    this.unsupportedPanel = this.createPanel(this.containers.experience, "UnsupportedPanel", new vec2(35, 18))
    this.createText(
      this.unsupportedPanel,
      "UnsupportedTitle",
      "Unsupported sentence",
      new vec3(0, 5.6, Z_TEXT),
      new vec2(30, 3),
      55,
      COLORS.amber
    )
    this.unsupportedText = this.createText(
      this.unsupportedPanel,
      "UnsupportedMessage",
      "Try a supported phrase or one word/name.",
      new vec3(0, 1.1, Z_TEXT),
      new vec2(30, 4),
      41,
      COLORS.white
    )
    this.createButton(
      this.unsupportedPanel,
      "UnsupportedTryAgainButton",
      "Try Again",
      new vec3(-5.5, -5.4, Z_CONTROL),
      new vec2(9, 3.5),
      "Primary",
      this.callbacks.onTryAgain
    )
    this.createButton(
      this.unsupportedPanel,
      "UnsupportedCancelButton",
      "Cancel",
      new vec3(5.5, -5.4, Z_CONTROL),
      new vec2(9, 3.5),
      "Ghost",
      this.callbacks.onCancel
    )
  }

  private buildErrorPanel(): void {
    this.errorPanel = this.createPanel(this.containers.experience, "ErrorPanel", new vec2(34, 17))
    this.createText(
      this.errorPanel,
      "ErrorTitle",
      "SignBridge error",
      new vec3(0, 5.0, Z_TEXT),
      new vec2(30, 3),
      56,
      COLORS.red
    )
    this.errorText = this.createText(
      this.errorPanel,
      "ErrorMessage",
      "Unknown error",
      new vec3(0, 0.8, Z_TEXT),
      new vec2(30, 4),
      38,
      COLORS.white
    )
    this.createButton(
      this.errorPanel,
      "ErrorReturnButton",
      "Return to Idle",
      new vec3(0, -5.0, Z_CONTROL),
      new vec2(12, 3.4),
      "Secondary",
      this.callbacks.onCancel
    )
  }

  private buildWristButton(): void {
    this.speakButton = this.createButton(
      this.containers.wrist,
      "WristSpeakButton",
      "Speak",
      new vec3(0, 0, Z_CONTROL),
      new vec2(11.5, 4.2),
      "Primary",
      this.callbacks.onSpeak
    )
    this.createText(
      this.containers.wrist,
      "WristHint",
      "PINCH / CLICK",
      new vec3(0, -3.2, Z_TEXT),
      new vec2(12, 1.6),
      24,
      COLORS.cyan
    )
  }

  private buildDebugPanel(): void {
    this.debugPanel = this.createPanel(this.containers.debug, "PreviewDebugPanel", new vec2(29, 24), COLORS.charcoalLight)
    this.createText(
      this.debugPanel,
      "DebugTitle",
      "PREVIEW DEBUG",
      new vec3(0, 9.8, Z_TEXT),
      new vec2(25, 2.4),
      42,
      COLORS.cyan
    )
    this.debugText = this.createText(
      this.debugPanel,
      "DebugValues",
      "",
      new vec3(0, 1.2, Z_TEXT),
      new vec2(25, 14.2),
      27,
      COLORS.white,
      HorizontalAlignment.Left,
      VerticalAlignment.Top
    )
    this.fallbackButton = this.createButton(
      this.debugPanel,
      "ForceFallbackButton",
      "Fallback: AUTO",
      new vec3(0, -9.6, Z_CONTROL),
      new vec2(15, 3.1),
      "Secondary",
      this.callbacks.onForceFallback
    )
  }

  private buildDebugToggle(): void {
    this.createButton(
      this.containers.experience,
      "DebugToggleButton",
      "Debug",
      new vec3(17.3, 12.8, Z_CONTROL),
      new vec2(5.2, 2.5),
      "Ghost",
      () => this.setDebugVisible(!this.debugVisible)
    )
  }

  private setDebugVisible(visible: boolean): void {
    this.debugVisible = visible
    this.containers.debug.enabled = visible
  }

  private createPanel(parent: SceneObject, name: string, size: vec2, color: vec4 = COLORS.charcoal): SceneObject {
    const panel = this.createObject(parent, name, new vec3(0, 0, Z_BACKGROUND))
    const background = panel.createComponent(RoundedRectangle.getTypeName()) as RoundedRectangle
    background.size = size
    background.cornerRadius = 1.1
    background.gradient = false
    background.backgroundColor = color
    background.blendMode = RoundedRectBlendMode.Normal
    background.opacity = color.a
    background.renderOrder = 0
    background.initialize()
    return panel
  }

  private createButton(
    parent: SceneObject,
    name: string,
    label: string,
    position: vec3,
    size: vec2,
    style: string,
    callback: () => void
  ): ButtonRef {
    const root = this.createObject(parent, name, position)
    const button = root.createComponent(Button.getTypeName()) as Button
    // Keep the installed UIKit button/Interactable behavior while supplying a
    // compact SignBridge cyan/charcoal visual style.
    button.setVariant({theme: "SnapOS3", shape: "Rectangle", style})
    button.visual = new RoundedRectangleVisual({sceneObject: root, style: buttonStyle(style)})
    button.size = new vec3(size.x, size.y, 1)
    button.renderOrder = 10
    button.playAudio = true
    button.onTriggerUp.add((event) => {
      this.callbacks.onInteractionSource(
        this.interactionSourceName(event.interactor.inputType, event.interactor.previousTrigger)
      )
      callback()
    })
    button.initialize()

    const content = root.createComponent(ElementContent.getTypeName()) as ElementContent
    content.text = label
    content.textSize = BUTTON_TEXT_SIZE
    content.contentAlignment = "center"
    content.renderOrder = 12
    return {root, button, content}
  }

  private createText(
    parent: SceneObject,
    name: string,
    value: string,
    position: vec3,
    bounds: vec2,
    size: number,
    color: vec4,
    horizontalAlignment: HorizontalAlignment = HorizontalAlignment.Center,
    verticalAlignment: VerticalAlignment = VerticalAlignment.Center
  ): Text {
    const root = this.createObject(parent, name, position)
    const text = root.createComponent("Component.Text") as Text
    text.text = value
    text.size = size
    text.layoutRect = Rect.create(-bounds.x * 0.5, bounds.x * 0.5, -bounds.y * 0.5, bounds.y * 0.5)
    text.horizontalOverflow = HorizontalOverflow.Wrap
    text.verticalOverflow = VerticalOverflow.Shrink
    text.horizontalAlignment = horizontalAlignment
    text.verticalAlignment = verticalAlignment
    text.textFill.mode = TextFillMode.Solid
    text.textFill.color = color
    text.renderOrder = 20
    text.twoSided = true
    return text
  }

  private createObject(parent: SceneObject, name: string, position: vec3): SceneObject {
    const object = global.scene.createSceneObject(name)
    object.setParent(parent)
    object.layer = parent.layer
    object.getTransform().setLocalPosition(position)
    return object
  }

  private placeViewRelative(object: SceneObject, distance: number, offset: vec2): void {
    const position = this.camera
      .getForwardPosition(distance, false)
      .add(this.camera.right().uniformScale(offset.x))
      .add(this.camera.up().uniformScale(offset.y))
    object.getTransform().setWorldPosition(position)
    object
      .getTransform()
      .setWorldRotation(quat.lookAt(this.camera.getWorldPosition().sub(position).normalize(), this.camera.up()))
  }

  private interactionSourceName(inputType: InteractorInputType, triggerType: InteractorTriggerType): string {
    const handAction = triggerType === InteractorTriggerType.Poke ? "poke" : "pinch"
    switch (inputType) {
      case InteractorInputType.LeftHand:
        return `Left hand ${handAction}`
      case InteractorInputType.RightHand:
        return `Right hand ${handAction}`
      case InteractorInputType.BothHands:
        return `Both hands ${handAction}`
      case InteractorInputType.Mouse:
        return "Preview mouse click"
      case InteractorInputType.Mobile:
        return "Mobile"
      case InteractorInputType.BtController:
        return "Bluetooth controller"
      case InteractorInputType.CustomController:
        return "Custom controller"
      default:
        return `Input ${inputType}`
    }
  }
}
