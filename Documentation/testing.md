# Stage 1 Testing

## Environment

- Lens Studio: 5.23.1
- Target: Spectacles / SPECS
- Preview: SPECS27 Interactive Plane Front
- Installed interaction/UI packages: Spectacles Interaction Kit 2.0.0 and Spectacles UIKit 2.0.0
- Baseline commit: `0f59ca3ed668c40eecd84debb2dad662ba7d2018`

## Baseline evidence

- The untouched stock Lens compiled and ran with zero runtime errors.
- `SpectaclesInteractionKit` and `SIKExamples` were present and enabled in the baseline.
- The retained runtime included SIK hand/mouse interaction and MCP Preview-agent inspection objects.

## Stage 1 automated/runtime matrix

| Test | Expected | Result | Evidence/notes |
|---|---|---|---|
| TypeScript compile | No Stage 1 compiler errors | Passed | Final forced compilation succeeded. |
| Resolver unit suite | All deterministic cases pass | Passed | Logger: `PASS 23/23 deterministic resolver checks`. |
| Mouse activates Speak | Idle -> Listening -> Review | Passed | Logger identified `Preview mouse click`; Review displayed the selected transcript. |
| Simulated pinch activates Speak | Same trigger-up path as mouse | Passed | Logger identified `Right hand pinch`; Idle -> Listening -> Review. |
| Kaustubh resolution | `MY_NAME_IS`, K, A, U, S, T, U, B, H | Passed | Exact nine-token sequence recorded in runtime logs. |
| Confirm starts playback | Review -> selected mode | Passed | Review -> Resolving -> Demonstrating/GuidedPractice. |
| Quick Mode advances | Tokens advance automatically at 0.75x | Passed | Observed 4/9 during playback, then 9/9 and `Sequence complete`. |
| Guided Mode pauses | Each token awaits/respects guided control | Passed | Remained at 1/9; Next moved to K and displayed `Future ML-scored target`. |
| Try Again | Returns to mock listening and review | Passed | Review -> Listening -> Review with a fresh mock result. |
| Cancel | Returns to Idle | Passed | Review -> Idle. |
| Unsupported sentence | Exact fallback message displayed | Passed | Displayed `Try a supported phrase or one word/name.` |
| Unknown word | `Nova` fingerspells N-O-V-A | Passed | Runtime result: N, O, V, A letter tokens. |
| Tracking loss fallback | Speak moves to stable view-relative fallback | Passed | Preview reported wrist unavailable and view fallback; force-fallback control also worked. |
| Exit | Returns to Idle | Passed | Completed -> Idle and player disabled. |
| Stock examples | `SIKExamples` remains present and disabled | Passed | Persisted editor scene and runtime root both show disabled. |
| Retained SIK | `SpectaclesInteractionKit` remains enabled/functional | Passed | Both HandInteractors and MouseInteractor enabled; pinch and mouse paths passed. |

## Final log status

- Final compile: succeeded.
- Final clean refresh: no errors or warnings.
- Startup evidence: SIK initialized, resolver suite passed 23/23, and Stage 1 initialized in mock/placeholder mode.
- Historical hot-reload warnings and an intermediate missing-container compile error occurred while two dependent files were being updated; they were resolved before the final compile and did not recur in the clean refresh.

## Preview versus device

Preview validates UI layout, mouse activation, simulated hand/pinch routing, mock transcript flows, deterministic resolution, state guards, token playback, controls, and forced tracking-loss fallback. Physical Spectacles are still required to validate real wrist comfort/jitter, field-of-view ergonomics, true pinch reliability, thermal/performance behavior, and any future ASR or ML gesture model.

Not possible in Stage 1 Preview:

- Real Spectacles ASR capture or microphone permissions.
- Physical-device wrist placement, smoothing comfort, and tracking-loss recovery.
- Verified 3D ASL animation playback, because no verified content is attached.
- Gesture recognition or accuracy for A, B, K, S, and U, because no trained/validated model is attached.
- SnapML on-device deployment, latency, thermal, and accuracy validation.

## Manual test procedure

1. Open `SignBridgeAR.esproj` in Lens Studio 5.23.1 and refresh **Preview 1**.
2. In Scene Hierarchy, confirm `SIKExamples` is present but disabled. Confirm `SpectaclesInteractionKit`, `AiPreviewAgent Handler`, and `SignBridge` remain enabled.
3. Confirm the Idle panel shows `My name is Kaustubh`, **Quick mode**, the wrist/fallback **Speak** control, and a hidden-by-default **Debug** panel toggle.
4. Click **Speak** with the Preview mouse. Confirm the button briefly shows `Listening...`, then the Review panel displays `My name is Kaustubh`.
5. Select **Confirm**. Confirm the placeholder warning is visible and the sequence begins with `PHRASE: MY_NAME_IS`, followed by K-A-U-S-T-U-B-H.
6. In Quick Mode, verify automatic advancement at the default 0.75x speed. Exercise **Pause/Resume**, **Previous**, **Next**, **Replay**, and **Speed**; allow the sequence to reach 9/9 and `Sequence complete`.
7. Select **Exit** and confirm the experience returns to Idle.
8. Switch to **Guided mode**, repeat Speak/Confirm, and wait. Confirm playback stays at 1/9. Select **Next** to K and confirm `Future ML-scored target`; inspect H or T and confirm `Demonstration only - not currently scored`. No accuracy value should appear.
9. From Review, test **Try Again** and confirm it returns through mock Listening to Review. Test **Cancel** and confirm it returns to Idle.
10. Use **Next mock** to select `Nova`; Speak and Confirm. Confirm the tokens are N-O-V-A.
11. Select `Can you tell me where the railway station is?`; Speak and Confirm. Confirm the Unsupported panel displays exactly `Try a supported phrase or one word/name.` and that both recovery controls work.
12. Open **Debug**. Confirm state, selected transcript, resolver result, token index, wrist availability, interaction source, and last error are shown. Toggle **Force fallback** and confirm the Speak control stays at its stable view-relative position.
13. Use the MCP Preview hand simulation (or Lens Studio's available hand simulation) to pinch Speak and Confirm; verify the same trigger-up flow as mouse input.
14. Refresh Preview and inspect Lens Studio Logger. Confirm `PASS 23/23 deterministic resolver checks` and no Stage 1 errors or warnings.
