/**
 * Types for the activity log payload.
 *
 * Everything in here is written once and never updated: the `Activity` table is
 * append-only. `changes` is computed at write time on purpose, so an entry keeps
 * meaning the same thing even if the diffing rules change later.
 */

export const ACTIVITY_PAYLOAD_VERSION = 1 as const

/** A JSON-safe value. Dates and Decimals are serialized before they get here. */
export type LoggedValue =
  | string
  | number
  | boolean
  | null
  | LoggedValue[]
  | { [key: string]: LoggedValue }

export type FieldChange = {
  /** Stable key, translated through `Activity.Fields.<field>` in the UI. */
  field: string
  before: LoggedValue
  after: LoggedValue
}

export type ExpensePaidForSnapshot = {
  participantId: string
  name: string
  shares: number
}

export type ExpenseSnapshot = {
  title: string
  /** Minor units (cents). Never a float. */
  amount: number
  originalAmount: number | null
  originalCurrency: string | null
  /** Decimal serialized as a string to avoid float drift. */
  conversionRate: string | null
  /** `YYYY-MM-DD`. */
  expenseDate: string
  categoryId: number
  categoryName: string | null
  paidById: string
  paidByName: string
  paidFor: ExpensePaidForSnapshot[]
  splitMode: string
  isReimbursement: boolean
  recurrenceRule: string
  notes: string | null
  documentCount: number
}

export type GroupParticipantSnapshot = {
  participantId: string
  name: string
}

export type GroupSnapshot = {
  name: string
  currency: string
  currencyCode: string | null
  information: string | null
  participants: GroupParticipantSnapshot[]
}

export type ActivityPayload<TSnapshot = ExpenseSnapshot | GroupSnapshot> = {
  v: typeof ACTIVITY_PAYLOAD_VERSION
  /** Absent on creation. */
  before?: TSnapshot | null
  /** Absent on deletion. */
  after?: TSnapshot | null
  changes: FieldChange[]
}

export type ExpenseActivityPayload = ActivityPayload<ExpenseSnapshot>
export type GroupActivityPayload = ActivityPayload<GroupSnapshot>

/**
 * Narrows the untyped `Json` column coming back from Prisma. Returns null for
 * rows written before this feature existed, or anything that does not look like
 * a payload we wrote.
 */
export function parseActivityPayload(value: unknown): ActivityPayload | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null
  }
  const candidate = value as Record<string, unknown>
  if (candidate.v !== ACTIVITY_PAYLOAD_VERSION) return null
  if (!Array.isArray(candidate.changes)) return null
  return candidate as unknown as ActivityPayload
}
