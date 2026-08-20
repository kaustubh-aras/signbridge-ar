import {SUPPORTED_PHRASES} from "../../Data/SupportedPhrases"
import {PhraseEntry, SignSequence, SignToken, TranslationResult} from "./SignTypes"

export const UNSUPPORTED_SENTENCE_MESSAGE = "Try a supported phrase or one word/name."
export const EMPTY_INPUT_MESSAGE = "Say or select a supported phrase or one word/name."
export const NO_ALPHA_MESSAGE = "Enter at least one alphabetic character."

const FUTURE_ML_LETTERS: ReadonlyArray<string> = ["A", "B", "K", "S", "U"]

/**
 * Deterministic resolver for the intentionally constrained Stage 1 language
 * surface. It produces semantic tokens only; it never generates hand poses.
 */
export class PhraseResolver {
  private readonly phraseByCanonical: Record<string, PhraseEntry> = {}

  constructor() {
    for (const entry of SUPPORTED_PHRASES) {
      this.phraseByCanonical[this.canonicalize(entry.phrase)] = entry
    }
  }

  public resolve(transcript: string): TranslationResult {
    const trimmed = transcript.trim()
    if (trimmed.length === 0) {
      return {kind: "Empty", message: EMPTY_INPUT_MESSAGE}
    }

    const canonical = this.canonicalize(trimmed)
    if (canonical.length === 0) {
      return {kind: "Empty", message: NO_ALPHA_MESSAGE}
    }

    const exactPhrase = this.phraseByCanonical[canonical]
    if (exactPhrase) {
      return this.sequenceResult(trimmed, [this.phraseToken(exactPhrase)])
    }

    const namePrefix = "my name is "
    if (canonical.indexOf(namePrefix) === 0) {
      const name = canonical.substring(namePrefix.length).replace(/\s+/g, "")
      if (name.length > 0 && /^[a-z]+$/.test(name)) {
        const tokens: SignToken[] = [this.phraseToken(this.phraseByCanonical["my name is"])]
        tokens.push(...this.letterTokens(name))
        return this.sequenceResult(trimmed, tokens)
      }
      return {kind: "Unsupported", message: UNSUPPORTED_SENTENCE_MESSAGE}
    }

    // A single whitespace-delimited input may include punctuation or digits;
    // only its supported alphabetic characters become fingerspelling tokens.
    if (!/\s/.test(trimmed)) {
      const letters = trimmed.match(/[a-z]/gi) ?? []
      if (letters.length === 0) {
        return {kind: "Empty", message: NO_ALPHA_MESSAGE}
      }
      return this.sequenceResult(trimmed, this.letterTokens(letters.join("")))
    }

    return {kind: "Unsupported", message: UNSUPPORTED_SENTENCE_MESSAGE}
  }

  public canonicalize(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z]+/g, " ")
      .trim()
      .replace(/\s+/g, " ")
  }

  private sequenceResult(originalTranscript: string, tokens: SignToken[]): TranslationResult {
    const sequence: SignSequence = {originalTranscript, tokens}
    return {kind: "Sequence", sequence}
  }

  private phraseToken(entry: PhraseEntry): SignToken {
    return {
      id: `PHRASE_${entry.id}`,
      type: "Phrase",
      label: entry.displayName,
      phraseId: entry.id,
      guidedScoring: "DemonstrationOnly"
    }
  }

  private letterTokens(value: string): SignToken[] {
    const tokens: SignToken[] = []
    for (const character of value.toUpperCase()) {
      if (character < "A" || character > "Z") {
        continue
      }
      tokens.push({
        id: `LETTER_${character}`,
        type: "Fingerspelling",
        label: character,
        letter: character,
        guidedScoring: FUTURE_ML_LETTERS.includes(character) ? "FutureMLTarget" : "DemonstrationOnly"
      })
    }
    return tokens
  }
}
