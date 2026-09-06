import { Participant } from '@/generated/prisma/browser'
import { Balances } from '@/lib/balances'
import { Currency } from '@/lib/currency'
import { cn, formatCurrency } from '@/lib/utils'
import { useLocale } from 'next-intl'

type Props = {
  balances: Balances
  participants: Participant[]
  currency: Currency
}

export function BalancesList({ balances, participants, currency }: Props) {
  const locale = useLocale()

  return (
    <div className="text-sm">
      {participants.map((participant) => {
        const balance = balances[participant.id]?.total ?? 0
        const isPositive = balance > 0
        const isNegative = balance < 0
        return (
          <div
            key={participant.id}
            data-testid="balance-row"
            data-participant={participant.name}
            className="flex items-center justify-between gap-3 py-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 font-semibold text-orange-900 dark:bg-orange-900/40 dark:text-orange-100">
                {participant.name.charAt(0).toUpperCase()}
              </div>
              <span className="truncate">{participant.name}</span>
            </div>
            <div
              className={cn(
                'shrink-0 font-bold',
                isPositive && 'text-green-600 dark:text-green-400',
                isNegative && 'text-red-600 dark:text-red-400',
              )}
            >
              {isPositive && '+'}
              {formatCurrency(currency, balance, locale)}
            </div>
          </div>
        )
      })}
    </div>
  )
}
