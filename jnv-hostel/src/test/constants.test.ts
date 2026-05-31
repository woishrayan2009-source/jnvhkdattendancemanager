import { describe, it, expect } from 'vitest'
import { getCurrentSession, SESSIONS } from '@/constants/sessions'
import { HOUSES, CLASS_SECTIONS } from '@/constants/houses'

describe('sessions constants', () => {
  it('has exactly 3 sessions', () => {
    expect(SESSIONS).toHaveLength(3)
  })

  it('sessions are morning, evening, night in order', () => {
    const ids = SESSIONS.map((s: typeof SESSIONS[number]) => s.id)
    expect(ids).toEqual(['morning', 'evening', 'night'])
  })

  it('getCurrentSession returns a valid session object', () => {
    const session = getCurrentSession()
    expect(SESSIONS.map((s) => s.id)).toContain(session.id)
  })
})

describe('houses constants', () => {
  it('has exactly 4 houses', () => {
    expect(HOUSES).toHaveLength(4)
  })

  it('all houses have id, name, color', () => {
    for (const house of HOUSES as typeof HOUSES) {
      expect(house.id).toBeTruthy()
      expect(house.name).toBeTruthy()
      expect(house.color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})

describe('class sections', () => {
  it('classes 6-10 have sections A and B', () => {
    for (const cls of [6, 7, 8, 9, 10]) {
      expect(CLASS_SECTIONS[cls]).toEqual(['A', 'B'])
    }
  })

  it('classes 11-12 have Science and Commerce', () => {
    for (const cls of [11, 12]) {
      expect(CLASS_SECTIONS[cls]).toEqual(['Science', 'Commerce'])
    }
  })
})
