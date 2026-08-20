import {PhraseEntry} from "../Scripts/Translation/SignTypes"

export const SUPPORTED_PHRASES: ReadonlyArray<PhraseEntry> = [
  phrase("HELLO", "Hello"),
  phrase("THANK_YOU", "Thank you"),
  phrase("PLEASE", "Please"),
  phrase("YES", "Yes"),
  phrase("NO", "No"),
  phrase("HELP", "Help"),
  phrase("SORRY", "Sorry"),
  phrase("MY_NAME_IS", "My name is"),
  phrase("WHAT_IS_YOUR_NAME", "What is your name?"),
  phrase("NICE_TO_MEET_YOU", "Nice to meet you"),
  phrase("I_UNDERSTAND", "I understand"),
  phrase("I_DO_NOT_UNDERSTAND", "I do not understand"),
  phrase("PLEASE_REPEAT", "Please repeat"),
  phrase("EMERGENCY", "Emergency")
]

function phrase(id: string, text: string): PhraseEntry {
  return {
    id,
    phrase: text,
    displayName: text,
    assetStatus: "VerifiedAnimationNotAttached"
  }
}
