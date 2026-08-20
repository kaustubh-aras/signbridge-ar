# SignBridge AR

SignBridge AR is an accessibility-focused Spectacles experience for the CLAD Summer Hackathon. It gives a hearing wearer a constrained, transparent way to demonstrate verified ASL content or fingerspell a single word/name, then later practise selected signs with gesture feedback.

Stage 1 is now implemented as a Preview-first vertical slice:

`Wrist Speak button -> mock speech -> transcript review -> deterministic resolution -> labelled token playback -> completion`

No unrestricted English-to-ASL translation is attempted. No ASL hand animation, real ASR, gesture scoring, or trained ML model is included in Stage 1. Token cards are deliberately labelled placeholders until verified content is supplied.

## Supported phrase vocabulary

- Hello
- Thank you
- Please
- Yes
- No
- Help
- Sorry
- My name is
- What is your name?
- Nice to meet you
- I understand
- I do not understand
- Please repeat
- Emergency

Unknown single words are fingerspelled using alphabetic characters. `My name is Kaustubh` resolves to `PHRASE: MY_NAME_IS` followed by `K-A-U-S-T-U-B-H`. Other unknown multiword sentences return a clear unsupported-sentence message.

## Project layout

- `Assets/SignBridge/` — authored Stage 1 Lens assets and TypeScript.
- `PROJECT_PLAN.md` — architecture, constraints, and staged roadmap.
- `PROMPT_LOG.md` — Codex/CLAD work log and decisions.
- `Documentation/testing.md` — test matrix, runtime evidence, and manual test steps.

The stock `SIKExamples` root is retained but disabled. `SpectaclesInteractionKit` and all MCP Preview-agent instrumentation remain installed and enabled for inspection and automation.

## Run the Stage 1 demo

1. Open `SignBridgeAR.esproj` in Lens Studio 5.23.1 and refresh Preview.
2. Choose one of the four mock transcripts with **Next mock**.
3. Choose **Quick mode** or **Guided mode**.
4. Pinch or Preview-click the wrist/fallback **Speak** control.
5. Review the transcript, then choose **Confirm**, **Try Again**, or **Cancel**.
6. Use the labelled token player controls. **Exit** always returns to Idle.

The **Debug** control is Preview-only and hidden by default. It exposes state, resolver, tracking, interaction-source, and error diagnostics plus a force-fallback test control.

## Safety and content policy

Semantic token identifiers are not a claim that an animation is linguistically verified. Stage 1 visibly states `PLACEHOLDER — VERIFIED ASL ANIMATION NOT YET ATTACHED` and renders no fabricated sign poses. Verified animation assets must be reviewed and attached in a later stage.
