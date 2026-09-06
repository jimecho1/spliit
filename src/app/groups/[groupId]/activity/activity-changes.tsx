'use client'

import {
  parseActivityPayload,
  type FieldChange,
  type LoggedValue,
} from '@/lib/activity-log'
import { Currency } from '@/lib/currency'
import { formatCurrency } from '@/lib/utils'
import { ArrowRight } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'

type Props = {
  payload: unknown
  currency: Currency
}

/** Fields whose value is an amount in minor units. */
const CURRENCY_FIELDS = new Set(['amount', 'originalAmount'])
/** Fields whose value is a `YYYY-MM-DD` string. */
const DATE_FIELDS = new Set(['expenseDate'])
/** Fields whose value is an enum with its own translation. */
const ENUM_FIELDS = new Set(['splitMode', 'recurrenceRule'])

/**
 * Display order for a whole-snapshot view. Postgres `jsonb` does not preserve
 * key order, so the order has to be stated here rather than read off the object.
 */
const SNAPSHOT_FIELD_ORDER = [
  'title',
  'name',
  'amount',
  'originalAmount',
  'originalCurrency',
  'conversionRate',
  'currency',
  'currencyCode',
  'expenseDate',
  'categoryName',
  'paidByName',
  'paidFor',
  'splitMode',
  'recurrenceRule',
  'isReimbursement',
  'notes',
  'information',
  'documentCount',
]

/** Never worth a row of its own in a snapshot: ids, and unset defaults. */
const SNAPSHOT_HIDDEN_FIELDS = new Set([
  'paidById',
  'categoryId',
  'participants',
])

function isDefaultValue(value: LoggedValue): boolean {
  return (
    value === null ||
    value === '' ||
    value === false ||
    value === 0 ||
    value === 'NONE'
  )
}

function isPaidForList(
  value: LoggedValue,
): value is { name: string; shares: number }[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) => typeof entry === 'object' && entry !== null && 'name' in entry,
    )
  )
}

function FormattedValue({
  field,
  value,
  currency,
}: {
  field: string
  value: LoggedValue
  currency: Currency
}) {
  const locale = useLocale()
  const t = useTranslations('Activity.Changes')
  const tValues = useTranslations('Activity.Values')

  if (value === null || value === '') {
    return <span className="text-muted-foreground italic">{t('empty')}</span>
  }

  if (typeof value === 'boolean') {
    return <>{value ? t('yes') : t('no')}</>
  }

  if (CURRENCY_FIELDS.has(field) && typeof value === 'number') {
    return <>{formatCurrency(currency, value, locale)}</>
  }

  if (DATE_FIELDS.has(field) && typeof value === 'string') {
    // Stored as a plain date; render it without shifting across timezones.
    const [year, month, day] = value.split('-').map(Number)
    if (year && month && day) {
      return (
        <>
          {new Date(year, month - 1, day).toLocaleDateString(locale, {
            dateStyle: 'medium',
          })}
        </>
      )
    }
  }

  if (ENUM_FIELDS.has(field) && typeof value === 'string') {
    return <>{tValues.has(value as any) ? tValues(value as any) : value}</>
  }

  if (isPaidForList(value)) {
    return (
      <>
        {value
          .map((entry) =>
            entry.shares === 1 ? entry.name : `${entry.name} (${entry.shares})`,
          )
          .join(', ')}
      </>
    )
  }

  if (Array.isArray(value)) {
    return <>{value.map((entry) => String(entry)).join(', ')}</>
  }

  if (typeof value === 'object') {
    return <>{JSON.stringify(value)}</>
  }

  return <>{String(value)}</>
}

function ChangeRow({
  change,
  currency,
}: {
  change: FieldChange
  currency: Currency
}) {
  const t = useTranslations('Activity.Fields')
  const label = t.has(change.field as any)
    ? t(change.field as any)
    : change.field

  return (
    <div className="grid grid-cols-[minmax(5rem,auto)_1fr] gap-x-3 gap-y-0.5 py-1 sm:grid-cols-[8rem_1fr]">
      <div className="text-xs font-medium text-muted-foreground pt-px">
        {label}
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
        {change.before !== null && (
          <span className="line-through text-muted-foreground break-all">
            <FormattedValue
              field={change.field}
              value={change.before}
              currency={currency}
            />
          </span>
        )}
        {change.before !== null && change.after !== null && (
          <ArrowRight className="w-3 h-3 shrink-0 text-muted-foreground" />
        )}
        {change.after !== null && (
          <span className="font-medium break-all">
            <FormattedValue
              field={change.field}
              value={change.after}
              currency={currency}
            />
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Renders the before -> after detail of one activity entry. Returns null for
 * entries written before this feature existed, so old logs still render.
 */
export function ActivityChanges({ payload, currency }: Props) {
  const t = useTranslations('Activity.Changes')
  const parsed = parseActivityPayload(payload)

  if (!parsed) {
    return <p className="text-xs text-muted-foreground">{t('noDetail')}</p>
  }

  if (parsed.changes.length === 0) {
    // Creation and deletion have no diff: show the snapshot they carry.
    const snapshot = parsed.after ?? parsed.before
    if (!snapshot) {
      return <p className="text-xs text-muted-foreground">{t('noDetail')}</p>
    }
    const entries = new Map(Object.entries(snapshot))
    const changes: FieldChange[] = SNAPSHOT_FIELD_ORDER.filter(
      (field) => entries.has(field) && !SNAPSHOT_HIDDEN_FIELDS.has(field),
    )
      .map((field) => ({
        field,
        before: null,
        after: entries.get(field) as LoggedValue,
      }))
      .filter((change) => !isDefaultValue(change.after))
    return (
      <div className="mt-1">
        {changes.map((change) => (
          <ChangeRow key={change.field} change={change} currency={currency} />
        ))}
      </div>
    )
  }

  return (
    <div className="mt-1">
      {parsed.changes.map((change, index) => (
        <ChangeRow
          key={`${change.field}-${index}`}
          change={change}
          currency={currency}
        />
      ))}
    </div>
  )
}
