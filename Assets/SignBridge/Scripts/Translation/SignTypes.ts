export type SignTokenType = "Phrase" | "Fingerspelling"
export type TranslationResultKind = "Sequence" | "Unsupported" | "Empty"
export type GuidedScoringStatus = "FutureMLTarget" | "DemonstrationOnly"

/** A semantic dictionary entry. Stage 1 does not attach an animation asset. */
export interface SignEntry {
  id: string
  displayName: string
  assetStatus: "VerifiedAnimationNotAttached"
}

export interface PhraseEntry extends SignEntry {
  phrase: string
}

export interface SignToken {
  id: string
  type: SignTokenType
  label: string
  phraseId?: string
  letter?: string
  guidedScoring: GuidedScoringStatus
}

export interface SignSequence {
  originalTranscript: string
  tokens: SignToken[]
}

export interface TranslationResult {
  kind: TranslationResultKind
  sequence?: SignSequence
  message?: string
}

export function formatToken(token: SignToken): string {
  return token.type === "Phrase" ? `PHRASE: ${token.phraseId}` : `LETTER: ${token.letter}`
}
