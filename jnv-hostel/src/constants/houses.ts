// ─── House definitions ────────────────────────────────────────────────────────
export const HOUSES = [
  { id: 'nilgiri',  name: 'Nilgiri',  color: '#16a34a', bgClass: 'bg-green-600',  textClass: 'text-green-700', borderClass: 'border-green-500' },
  { id: 'aravali',  name: 'Aravali',  color: '#2563eb', bgClass: 'bg-blue-600',   textClass: 'text-blue-700',  borderClass: 'border-blue-500'  },
  { id: 'shivalik', name: 'Shivalik', color: '#d97706', bgClass: 'bg-amber-600',  textClass: 'text-amber-700', borderClass: 'border-amber-500' },
  { id: 'udaygiri', name: 'Udaygiri', color: '#dc2626', bgClass: 'bg-red-600',    textClass: 'text-red-700',   borderClass: 'border-red-500'   },
] as const

export type HouseId = typeof HOUSES[number]['id']

export const HOUSE_MAP = Object.fromEntries(
  HOUSES.map((h) => [h.id, h])
) as Record<HouseId, typeof HOUSES[number]>

// ─── Class sections ───────────────────────────────────────────────────────────
export const CLASS_SECTIONS: Record<number, string[]> = {
  6:  ['A', 'B'],      // Sub-Junior — section A & B
  7:  ['A', 'B'],
  8:  ['A', 'B'],
  9:  ['A', 'B'],
  10: ['A', 'B'],
  11: ['Science', 'Commerce'],
  12: ['Science', 'Commerce'],
}

// ─── Hostel groupings ─────────────────────────────────────────────────────────
export const HOSTELS = [
  // Sub-Junior (Class 6 boys only — one shared hostel)
  { id: 'sj-boys',   name: 'Sub-Junior Boys',   section: 'sub_junior', houses: ['nilgiri', 'aravali', 'shivalik', 'udaygiri'] as HouseId[], classes: [6],     gender: 'male'   },

  // Girls (Class 6–12, one hostel per house)
  { id: 'girls-nil', name: 'Girls – Nilgiri',   section: 'girls',      houses: ['nilgiri']  as HouseId[], classes: [6,7,8,9,10,11,12], gender: 'female' },
  { id: 'girls-ara', name: 'Girls – Aravali',   section: 'girls',      houses: ['aravali']  as HouseId[], classes: [6,7,8,9,10,11,12], gender: 'female' },
  { id: 'girls-shi', name: 'Girls – Shivalik',  section: 'girls',      houses: ['shivalik'] as HouseId[], classes: [6,7,8,9,10,11,12], gender: 'female' },
  { id: 'girls-udy', name: 'Girls – Udaygiri',  section: 'girls',      houses: ['udaygiri'] as HouseId[], classes: [6,7,8,9,10,11,12], gender: 'female' },

  // Junior Boys (Class 7–9)
  { id: 'jb-1',      name: 'Junior Boys – H1',  section: 'junior',     houses: ['nilgiri', 'aravali']  as HouseId[], classes: [7,8,9], gender: 'male' },
  { id: 'jb-2',      name: 'Junior Boys – H2',  section: 'junior',     houses: ['shivalik', 'udaygiri'] as HouseId[], classes: [7,8,9], gender: 'male' },

  // Senior Boys (Class 10–12, one per house)
  { id: 'sb-nil',    name: 'Senior Boys – Nilgiri',   section: 'senior', houses: ['nilgiri']  as HouseId[], classes: [10,11,12], gender: 'male' },
  { id: 'sb-ara',    name: 'Senior Boys – Aravali',   section: 'senior', houses: ['aravali']  as HouseId[], classes: [10,11,12], gender: 'male' },
  { id: 'sb-shi',    name: 'Senior Boys – Shivalik',  section: 'senior', houses: ['shivalik'] as HouseId[], classes: [10,11,12], gender: 'male' },
  { id: 'sb-udy',    name: 'Senior Boys – Udaygiri',  section: 'senior', houses: ['udaygiri'] as HouseId[], classes: [10,11,12], gender: 'male' },
] as const

export type HostelId = typeof HOSTELS[number]['id']
