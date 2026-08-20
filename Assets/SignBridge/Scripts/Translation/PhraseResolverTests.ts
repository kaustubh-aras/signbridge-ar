import {SUPPORTED_PHRASES} from "../../Data/SupportedPhrases"
import {PhraseResolver, UNSUPPORTED_SENTENCE_MESSAGE} from "./PhraseResolver"
import {formatToken, TranslationResult} from "./SignTypes"

export interface ResolverTestReport {
  passed: number
  failed: number
  failures: string[]
}

export function runPhraseResolverTests(): ResolverTestReport {
  const resolver = new PhraseResolver()
  const failures: string[] = []
  let passed = 0

  const check = (name: string, condition: boolean, detail: string): void => {
    if (condition) {
      passed += 1
    } else {
      failures.push(`${name}: ${detail}`)
    }
  }

  check("capitalization", tokens(resolver.resolve("hELLo")) === "PHRASE: HELLO", trueDetail("HELLO"))
  check("punctuation", tokens(resolver.resolve("Hello!!!")) === "PHRASE: HELLO", trueDetail("HELLO"))
  check(
    "extra spaces",
    tokens(resolver.resolve("  My   name is   Kaustubh  ")) ===
      "PHRASE: MY_NAME_IS|LETTER: K|LETTER: A|LETTER: U|LETTER: S|LETTER: T|LETTER: U|LETTER: B|LETTER: H",
    "expected MY_NAME_IS plus K-A-U-S-T-U-B-H"
  )
  check("empty text", resolver.resolve("   ").kind === "Empty", "expected Empty")

  for (const phrase of SUPPORTED_PHRASES) {
    check(
      `supported phrase ${phrase.id}`,
      tokens(resolver.resolve(phrase.phrase)) === `PHRASE: ${phrase.id}`,
      `expected PHRASE: ${phrase.id}`
    )
  }

  check(
    "name sequence",
    tokens(resolver.resolve("My name is Kaustubh")) ===
      "PHRASE: MY_NAME_IS|LETTER: K|LETTER: A|LETTER: U|LETTER: S|LETTER: T|LETTER: U|LETTER: B|LETTER: H",
    "expected exact nine-token demo sequence"
  )
  check(
    "unknown single word",
    tokens(resolver.resolve("Nova")) === "LETTER: N|LETTER: O|LETTER: V|LETTER: A",
    "expected N-O-V-A"
  )

  const unsupported = resolver.resolve("Can you tell me where the railway station is?")
  check(
    "unsupported sentence",
    unsupported.kind === "Unsupported" && unsupported.message === UNSUPPORTED_SENTENCE_MESSAGE,
    `expected exact fallback: ${UNSUPPORTED_SENTENCE_MESSAGE}`
  )
  check(
    "non-alphabetic characters",
    tokens(resolver.resolve("N0v-a!")) === "LETTER: N|LETTER: V|LETTER: A",
    "expected alphabetic characters N-V-A only"
  )
  check("non-alphabetic only", resolver.resolve("123!!!").kind === "Empty", "expected Empty")

  return {passed, failed: failures.length, failures}
}

function tokens(result: TranslationResult): string {
  return result.sequence?.tokens.map(formatToken).join("|") ?? ""
}

function trueDetail(expected: string): string {
  return `expected ${expected}`
}
