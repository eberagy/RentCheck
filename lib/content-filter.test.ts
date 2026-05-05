import { describe, it, expect } from 'vitest'
import { shouldAutoFlag, checkReviewContent } from './content-filter'

describe('shouldAutoFlag', () => {
  it('passes empty / null / whitespace', () => {
    expect(shouldAutoFlag(null).flagged).toBe(false)
    expect(shouldAutoFlag(undefined).flagged).toBe(false)
    expect(shouldAutoFlag('').flagged).toBe(false)
    expect(shouldAutoFlag('   ').flagged).toBe(false)
  })

  it('does NOT flag everyday strong language (false-positive guard)', () => {
    // The whole point is that anger at landlords stays on the platform.
    expect(shouldAutoFlag('this landlord is terrible').flagged).toBe(false)
    expect(shouldAutoFlag('I hate this place').flagged).toBe(false)
    expect(shouldAutoFlag("I'll sue him in court").flagged).toBe(false)
    expect(shouldAutoFlag('garbage management').flagged).toBe(false)
  })

  it('flags identity slurs as reason=slur', () => {
    // The slur list normalizes obfuscation (a→@, e→3, i→1, o→0)
    const r = shouldAutoFlag('this is a ret@rd situation')
    expect(r.flagged).toBe(true)
    expect(r.reason).toBe('slur')
  })

  it('flags SSN-like number patterns as doxxing', () => {
    const r = shouldAutoFlag('his ssn is 123-45-6789')
    expect(r.flagged).toBe(true)
    expect(r.reason).toBe('doxxing')
  })

  it('flags "lives at <number>" as doxxing', () => {
    const r = shouldAutoFlag('John lives at 123 Main St')
    expect(r.flagged).toBe(true)
    expect(r.reason).toBe('doxxing')
  })

  it('flags "home address:" as doxxing', () => {
    const r = shouldAutoFlag('Home address: 123 Main')
    expect(r.flagged).toBe(true)
    expect(r.reason).toBe('doxxing')
  })

  it('flags explicit kill/shoot/stab threats', () => {
    // The regex is `(i'?ll|i am going to|gonna)\s+(kill|...)\s+(you|him|her|them|\w+)`
    expect(shouldAutoFlag("I'll kill you tomorrow").reason).toBe('threat')
    expect(shouldAutoFlag('gonna shoot him').reason).toBe('threat')
    expect(shouldAutoFlag('I am going to stab them').reason).toBe('threat')
  })

  it('flags self-harm encouragement as threat', () => {
    expect(shouldAutoFlag('go kill yourself').reason).toBe('threat')
    expect(shouldAutoFlag('shoot yourself').reason).toBe('threat')
  })

  it('does NOT flag the metaphorical "kill" sense', () => {
    // "kill" without the threat construction is fine
    expect(shouldAutoFlag('they really know how to kill the deal').flagged).toBe(false)
    expect(shouldAutoFlag('the noise will kill me').flagged).toBe(false)
  })
})

describe('checkReviewContent', () => {
  it('returns flagged when the title contains the trigger', () => {
    const r = checkReviewContent({ title: 'ret@rd landlord', body: 'normal body' })
    expect(r.flagged).toBe(true)
    expect(r.reason).toBe('slur')
  })

  it('returns flagged when only the body contains the trigger', () => {
    const r = checkReviewContent({ title: 'normal title', body: 'lives at 123 Main' })
    expect(r.flagged).toBe(true)
    expect(r.reason).toBe('doxxing')
  })

  it('passes when neither contains a trigger', () => {
    expect(checkReviewContent({ title: 'Bad place', body: 'leaky pipes for months' }).flagged).toBe(false)
  })
})
