# Prompt and Build Log

This document records the reproducible Codex CLI and CLAD workflow for SignBridge AR. Secrets, bearer tokens, credentials, and machine-specific configuration values are intentionally excluded.

## Project purpose

Build an accessibility-focused Spectacles experience that lets a hearing wearer speak a supported phrase or a single word/name, review the transcript, and demonstrate a constrained ASL token sequence. The hackathon demo sentence is `My name is Kaustubh`; the name must resolve to `K-A-U-S-T-U-B-H`.

## Codex CLI and CLAD workflow

- Codex CLI inspects and edits the shared project workspace.
- Lens Studio MCP tools are the only mechanism used to query, mutate, compile, run, inspect, interact with, or capture the Lens Studio application.
- Local `Support` definitions and installed package source are the authority for runtime API names.
- Git checkpoints provide recovery before and after Stage 1.
- Preview-agent instrumentation is intentionally retained for CLAD inspection and interaction.

## Important prompts and scope decisions

1. Inspect the complete project and assess SPECS feasibility without making changes.
2. Treat the Lens Studio Knowledge Base authentication failure as an isolated tool limitation; use only local definitions, package source/docs, project metadata, scene/runtime inspection, logs, Preview, and screenshots.
3. Mark capabilities confirmed only when found locally; use fallbacks for unconfirmed functionality.
4. Implement Stage 1 only after approval, retaining MCP instrumentation and installed packages.
5. Disable but do not delete `SIKExamples`; retain `SpectaclesInteractionKit`.
6. Use labelled token cards and never fabricate ASL poses.
7. Create baseline and feature commits plus project/testing documentation.

## Tools used

- Local filesystem search/read tools (`rg`, PowerShell) for project metadata, generated type definitions, and installed package source.
- Patch-based file editing for authored documentation and source.
- Git for recoverable checkpoints.
- Lens Studio MCP scene, compile, runtime-log, Preview interaction, hierarchy, and screenshot tools.

## Design decisions

- Curated phrase resolution plus single-word/name fingerspelling only.
- A guarded state machine prevents conflicting flows.
- Stage 1 uses `MockVoiceInputService`; the interface reserves a clean Stage 2 ASR boundary.
- SIK `HandInputData` supplies nondominant wrist position/rotation; a smoothed view-relative fallback keeps Speak reachable when tracking is absent.
- UIKit `Button` trigger-up is the single activation path for pinch and Preview mouse input.
- Quick Mode defaults to `0.75x`; Guided Mode pauses token-by-token and labels future scoring eligibility without calculating accuracy.
- Semantic token IDs remain separate from future verified animation assets.

## Tests performed

- Baseline project compile/run and clean-log inspection completed before Stage 1.
- Forced TypeScript compilation succeeded after final scene wiring.
- The in-Lens deterministic resolver suite passed 23/23 checks, covering capitalization, punctuation, extra spaces, empty input, supported phrases, names, unknown single words, unsupported sentences, and non-alphabetic input.
- Preview mouse trigger-up and simulated right-hand pinch both activated Speak through the retained SIK Interactable path.
- `My name is Kaustubh` produced exactly `PHRASE: MY_NAME_IS | LETTER: K | LETTER: A | LETTER: U | LETTER: S | LETTER: T | LETTER: U | LETTER: B | LETTER: H`.
- Quick Mode advanced to 9/9 and Completed; Guided Mode remained paused at each token and labelled K as a future ML-scored target without reporting accuracy.
- Try Again, Cancel, unsupported-sentence fallback, `Nova` fingerspelling, tracking-loss fallback, debug toggle, and Exit were exercised in Preview.
- Runtime hierarchy inspection confirmed `SIKExamples` present/disabled, `SpectaclesInteractionKit` enabled, both HandInteractors enabled, MouseInteractor enabled, retained Preview-agent instrumentation, and the SignBridge hierarchy.
- Final refresh logs contained zero errors or warnings. Full results and manual reproduction steps are in `Documentation/testing.md`.

## Errors encountered

- Lens Studio Knowledge Base queries returned an unauthenticated error despite visible Snapchat login. Per user direction, the tool was not retried and no HTTP workaround was used.
- `lens-studio-router` was not present. This reduces convenience/automation but does not block Lens runtime execution or Stage 1 because the connected Lens Studio MCP tools are available.
- A read-only Preview interaction probe caused Lens Studio to persist its managed Preview-agent instrumentation. The user explicitly chose to retain those dependencies.
- During a two-file hot reload, Lens Studio briefly reported missing compile data and one intermediate TypeScript error because the new `playback` container contract reached the UI file before the controller update. The completed source compiled cleanly on the next cycle.
- An early simulated pinch aimed at a broad interactable name could cross a neighbouring collider. Runtime world-position targeting made the automated interaction deterministic.
- Preview mouse injection required accounting for the Preview panel letterbox transform; a temporary diagnostic probe was removed after calibration.

## Fixes applied

- Switched capability verification to installed Lens Studio 5.23.1 definitions and installed SIK/UIKit source.
- Added ignore rules before the baseline commit so generated caches, editor workspace state, credentials/keys, lock files, logs, and machine-local agent configuration are not committed.
- Created baseline commit `0f59ca3ed668c40eecd84debb2dad662ba7d2018` with message `chore: checkpoint untouched SignBridge AR baseline`.
- Added the missing controller-side `playback` container wiring, then forced a complete TypeScript rebuild and clean Lens refresh.
- Used exact runtime object positions for MCP pinch tests and verified activation source in the Lens Logger.
- Calibrated and verified Preview mouse activation, then removed the temporary coordinate instrumentation and screenshot.
- Persisted the editor scene with the locally defined `Editor.Model.Project.save()` API through Lens Studio MCP; no project manifest or scene file was hand-edited.

## Stage 1 completion boundary

Stage 1 adds no real ASR, ASL animation, gesture score, SnapML model, external package, or network dependency. The missing `lens-studio-router` does not prevent CLAD execution: connected Lens Studio MCP compile, scene, runtime, interaction, logger, and screenshot tools all worked. Installing the router is optional for future workflow convenience and was not required before Stage 1.
