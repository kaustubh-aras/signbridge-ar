import {SignSequence, SignToken} from "../Translation/SignTypes"

export enum PlaybackMode {
  Quick = "QUICK MODE",
  Guided = "GUIDED MODE"
}
export interface TokenPlayerCallbacks {
  onTokenChanged: () => void
  onCompleted: () => void
}

export class TokenPlayer {
  public readonly speeds: ReadonlyArray<number> = [0.5, 0.75, 1.0, 1.25]

  private sequence: SignSequence | null = null
  private index = 0
  private elapsed = 0
  private paused = false
  private mode: PlaybackMode = PlaybackMode.Quick
  private speedIndex = 1
  private running = false

  constructor(private readonly callbacks: TokenPlayerCallbacks) {}

  public load(sequence: SignSequence, mode: PlaybackMode, speed: number): void {
    this.sequence = sequence
    this.mode = mode
    this.speedIndex = this.closestSpeedIndex(speed)
    this.index = 0
    this.elapsed = 0
    this.paused = mode === PlaybackMode.Guided
    this.running = sequence.tokens.length > 0
    this.callbacks.onTokenChanged()
  }

  public update(deltaTime: number): void {
    if (!this.running || this.paused || !this.sequence) {
      return
    }

    this.elapsed += deltaTime
    if (this.elapsed < this.tokenDuration) {
      return
    }

    this.elapsed = 0
    if (this.index >= this.sequence.tokens.length - 1) {
      this.complete()
      return
    }

    this.index += 1
    if (this.mode === PlaybackMode.Guided) {
      this.paused = true
    }
    this.callbacks.onTokenChanged()
  }

  public previous(): void {
    if (!this.sequence) return
    this.running = true
    this.index = Math.max(0, this.index - 1)
    this.elapsed = 0
    if (this.mode === PlaybackMode.Guided) this.paused = true
    this.callbacks.onTokenChanged()
  }

  public next(): void {
    if (!this.sequence) return
    if (this.index >= this.sequence.tokens.length - 1) {
      this.complete()
      return
    }
    this.running = true
    this.index += 1
    this.elapsed = 0
    if (this.mode === PlaybackMode.Guided) this.paused = true
    this.callbacks.onTokenChanged()
  }

  public replay(): void {
    if (!this.sequence) return
    this.index = 0
    this.elapsed = 0
    this.running = true
    this.paused = this.mode === PlaybackMode.Guided
    this.callbacks.onTokenChanged()
  }

  public togglePause(): void {
    if (!this.sequence) return
    this.running = true
    this.paused = !this.paused
    this.elapsed = 0
    this.callbacks.onTokenChanged()
  }

  public cycleSpeed(): number {
    this.speedIndex = (this.speedIndex + 1) % this.speeds.length
    this.elapsed = 0
    this.callbacks.onTokenChanged()
    return this.speed
  }

  public stop(): void {
    this.running = false
    this.sequence = null
    this.index = 0
    this.elapsed = 0
    this.paused = false
  }

  public get currentToken(): SignToken | null {
    return this.sequence?.tokens[this.index] ?? null
  }

  public get currentIndex(): number {
    return this.sequence ? this.index : -1
  }

  public get tokenCount(): number {
    return this.sequence?.tokens.length ?? 0
  }

  public get currentMode(): PlaybackMode {
    return this.mode
  }

  public get isPaused(): boolean {
    return this.paused
  }

  public get speed(): number {
    return this.speeds[this.speedIndex]
  }

  private get tokenDuration(): number {
    return 1.35 / this.speed
  }

  private complete(): void {
    this.running = false
    this.paused = true
    this.callbacks.onCompleted()
  }

  private closestSpeedIndex(speed: number): number {
    let closest = 0
    let closestDistance = Math.abs(this.speeds[0] - speed)
    for (let i = 1; i < this.speeds.length; i++) {
      const distance = Math.abs(this.speeds[i] - speed)
      if (distance < closestDistance) {
        closest = i
        closestDistance = distance
      }
    }
    return closest
  }
}
