# SignBridge AR Project Plan

## Product boundary

SignBridge AR supports a curated phrase dictionary and fingerspelling for names or unknown single words. It does not perform open-ended English-to-ASL translation. Unsupported multiword input is rejected with: `Try a supported phrase or one word/name.`

## Stage 1 architecture

- **Application:** guarded `AppStateMachine` with Idle, Listening, Review, Resolving, Demonstrating, GuidedPractice, Completed, Unsupported, and Error states.
- **Voice:** `VoiceInputService` contract and Preview-only `MockVoiceInputService`; real Spectacles ASR is deferred.
- **Translation:** deterministic, locally typed `PhraseResolver` backed by a curated phrase table.
- **Playback:** token-only `TokenPlayer`, with Quick and Guided modes and no fabricated gestures.
- **Tracking:** `WristAnchorController` reads the nondominant SIK wrist, smooths its pose, and falls back to a stable camera-relative position.
- **UI:** runtime-created Spectacles UIKit buttons/rounded panels plus Lens Text labels. All activation uses UIKit/Interactable trigger-up, which supports hand pinch and Preview mouse interaction through the retained SIK rig.
- **Debug:** a Preview toggle exposes state, mock input, resolver output, token index, tracking availability, interaction source, and last error. It is not part of the intended final experience.

## Proposed authored hierarchy

```text
SignBridge
├── App
├── WristUI
├── ExperienceUI
├── Playback
└── Debug
```

The controller creates the visible Stage 1 controls below these authored containers at runtime. The stock `SIKExamples` root remains present but disabled. `SpectaclesInteractionKit` remains present and enabled.

## Asset structure

```text
Assets/SignBridge/
├── Scripts/
│   ├── App/
│   ├── Voice/
│   ├── Translation/
│   ├── Playback/
│   ├── Tracking/
│   └── UI/
├── Data/
├── Prefabs/UI/
├── SignContent/
├── Materials/
├── Textures/
├── Audio/
└── ML/
```

## Development stages

1. **Stage 1 — Preview vertical slice (complete):** mock voice, review, deterministic resolver, placeholder playback, Quick/Guided behavior, wrist fallback, debug panel, and tests.
2. **Stage 2 — Device voice input:** add `SpectaclesAsrVoiceInputService` using only the locally confirmed `AsrModule`; retain the mock for Preview and regression tests.
3. **Stage 3 — Verified sign content:** acquire/review licensed or expert-verified phrase and fingerspelling animation assets, then map semantic tokens to those assets.
4. **Stage 4 — Guided recognition prototype:** collect/train or integrate a validated model for A, B, K, S, and U; test on physical Spectacles; never report synthetic accuracy.
5. **Stage 5 — accessibility/device refinement:** on-device comfort, latency, tracking-loss behavior, readability, interaction tuning, and user testing.

## Stage 1 implementation sequence

1. Create a recoverable baseline Git checkpoint and exclude generated, credential-bearing, and machine-specific files.
2. Add documentation and the `Assets/SignBridge` structure.
3. Disable (do not delete) `SIKExamples`; compile/run and verify the retained interaction rig.
4. Implement the guarded application state machine and mock voice contract.
5. Implement the deterministic resolver and runtime test suite.
6. Implement token playback for Quick and Guided modes.
7. Implement SIK wrist anchoring, smoothing, camera fallback, and a Preview force-fallback test hook.
8. Build the spatial UIKit controls and labelled placeholder panels.
9. Wire scene containers and the controller through Lens Studio MCP tools.
10. Compile, run, inspect logs/runtime state, exercise interactions, capture evidence, update documentation, and commit the completed Stage 1 slice.

All ten Stage 1 steps are complete. Stage 2 remains deliberately unstarted pending approval and device/API validation.

## Explicitly deferred

- Deprecated VoiceML transcription APIs
- Real ASR integration
- Unrestricted translation
- 3D ASL hand poses or animation
- Gesture accuracy claims
- SnapML training or deployment
- Stage 2 implementation
