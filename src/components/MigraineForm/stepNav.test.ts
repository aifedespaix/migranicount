import { describe, it, expect } from 'vitest'
import { nextStepIndex, prevStepIndex } from './stepNav'

describe('nextStepIndex', () => {
  it('advances by one when not at the last step', () => {
    expect(nextStepIndex(0, 8)).toBe(1)
    expect(nextStepIndex(3, 8)).toBe(4)
  })

  it('clamps at the last step', () => {
    expect(nextStepIndex(7, 8)).toBe(7)
  })
})

describe('prevStepIndex', () => {
  it('goes back by one when not at the first step', () => {
    expect(prevStepIndex(7, 8)).toBe(6)
    expect(prevStepIndex(1, 8)).toBe(0)
  })

  it('clamps at the first step', () => {
    expect(prevStepIndex(0, 8)).toBe(0)
  })
})
