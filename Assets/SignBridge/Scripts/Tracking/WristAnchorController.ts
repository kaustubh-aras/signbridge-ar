import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {HandInputData} from "SpectaclesInteractionKit.lspkg/Providers/HandInputData/HandInputData"

export interface WristAnchorConfig {
  target: SceneObject
  localOffset: vec3
  smoothingRate: number
  fallbackDistance: number
  fallbackOffset: vec2
}
/**
 * Positions the Speak control from the locally confirmed nondominant SIK
 * wrist keypoint. The wrist rotation rotates the local offset; the final
 * view-facing pose is smoothed for readability. Preview can force fallback.
 */
export class WristAnchorController {
  private readonly hand = HandInputData.getInstance().getNonDominantHand()
  private readonly camera = WorldCameraFinderProvider.getInstance()
  private readonly targetTransform: Transform
  private smoothedPosition: vec3 | null = null
  private smoothedRotation: quat | null = null
  private forceFallback = false
  private rawTrackingAvailable = false

  constructor(private readonly config: WristAnchorConfig) {
    this.targetTransform = config.target.getTransform()
  }

  public update(deltaTime: number): void {
    this.rawTrackingAvailable = this.hand.isTracked()
    const useWrist = this.rawTrackingAvailable && !this.forceFallback
    const targetPosition = useWrist ? this.getWristPosition() : this.getFallbackPosition()
    const targetRotation = this.getReadableRotation(targetPosition)
    const blend = 1 - Math.exp(-Math.max(0.01, this.config.smoothingRate) * Math.max(0, deltaTime))

    if (!this.smoothedPosition || !this.smoothedRotation) {
      this.smoothedPosition = targetPosition
      this.smoothedRotation = targetRotation
    } else {
      this.smoothedPosition = vec3.lerp(this.smoothedPosition, targetPosition, blend)
      this.smoothedRotation = quat.slerp(this.smoothedRotation, targetRotation, blend)
    }

    this.targetTransform.setWorldPosition(this.smoothedPosition)
    this.targetTransform.setWorldRotation(this.smoothedRotation)
  }

  public setForceFallback(forceFallback: boolean): void {
    this.forceFallback = forceFallback
  }

  public get isForceFallback(): boolean {
    return this.forceFallback
  }

  public get isTrackingAvailable(): boolean {
    return this.rawTrackingAvailable
  }

  public get placementMode(): string {
    if (this.forceFallback) return "View fallback (forced)"
    return this.rawTrackingAvailable ? "Nondominant wrist" : "View fallback (tracking unavailable)"
  }

  private getWristPosition(): vec3 {
    const wrist = this.hand.wrist
    const rotatedOffset = wrist.rotation.multiplyVec3(this.config.localOffset)
    return wrist.position.add(rotatedOffset)
  }

  private getFallbackPosition(): vec3 {
    return this.camera
      .getForwardPosition(this.config.fallbackDistance, false)
      .add(this.camera.right().uniformScale(this.config.fallbackOffset.x))
      .add(this.camera.up().uniformScale(this.config.fallbackOffset.y))
  }

  private getReadableRotation(position: vec3): quat {
    const toCamera = this.camera.getWorldPosition().sub(position).normalize()
    return quat.lookAt(toCamera, this.camera.up())
  }
}
