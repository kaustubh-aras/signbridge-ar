export enum AppState {
  Idle = "Idle",
  Listening = "Listening",
  Review = "Review",
  Resolving = "Resolving",
  Demonstrating = "Demonstrating",
  GuidedPractice = "GuidedPractice",
  Completed = "Completed",
  Unsupported = "Unsupported",
  Error = "Error"
}
const ALLOWED_TRANSITIONS: Record<AppState, ReadonlyArray<AppState>> = {
  [AppState.Idle]: [AppState.Listening, AppState.Error],
  [AppState.Listening]: [AppState.Review, AppState.Idle, AppState.Error],
  [AppState.Review]: [AppState.Listening, AppState.Resolving, AppState.Idle, AppState.Error],
  [AppState.Resolving]: [
    AppState.Demonstrating,
    AppState.GuidedPractice,
    AppState.Unsupported,
    AppState.Idle,
    AppState.Error
  ],
  [AppState.Demonstrating]: [AppState.Completed, AppState.Idle, AppState.Error],
  [AppState.GuidedPractice]: [AppState.Completed, AppState.Idle, AppState.Error],
  [AppState.Completed]: [AppState.Demonstrating, AppState.GuidedPractice, AppState.Idle, AppState.Error],
  [AppState.Unsupported]: [AppState.Listening, AppState.Idle, AppState.Error],
  [AppState.Error]: [AppState.Idle, AppState.Listening]
}

export type AppStateChanged = (previous: AppState, current: AppState) => void

/**
 * Small guarded state machine. Invalid transitions are rejected and reported
 * to the caller instead of allowing two experience flows to overlap.
 */
export class AppStateMachine {
  private state: AppState = AppState.Idle

  constructor(private readonly onChanged?: AppStateChanged) {}

  public get current(): AppState {
    return this.state
  }

  public canTransition(next: AppState): boolean {
    return next !== this.state && ALLOWED_TRANSITIONS[this.state].includes(next)
  }

  public transition(next: AppState): boolean {
    if (!this.canTransition(next)) {
      return false
    }

    const previous = this.state
    this.state = next
    this.onChanged?.(previous, next)
    return true
  }
}
