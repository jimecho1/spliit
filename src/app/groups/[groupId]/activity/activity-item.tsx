'use client'
import { ActivityChanges } from '@/app/groups/[groupId]/activity/activity-changes'
import { Button } from '@/components/ui/button'
import { ActivityType, Participant } from '@/generated/prisma/browser'
import { useActiveUser } from '@/lib/hooks'
import {
  DateTimeStyle,
  cn,
  formatDate,
  getCurrencyFromGroup,
} from '@/lib/utils'
import { trpc } from '@/trpc/client'
import { AppRouterOutput } from '@/trpc/routers/_app'
import { ChevronDown, ChevronRight, Undo2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useCurrentGroup } from '../current-group-context'

export type Activity =
  AppRouterOutput['groups']['activities']['list']['activities'][number]

type Props = {
  groupId: string
  activity: Activity
  participant?: Participant
  dateStyle: DateTimeStyle
}

function useSummary(activity: Activity, participantName?: string) {
  const t = useTranslations('Activity')
  const participant = participantName ?? t('someone')
  const expense = activity.data ?? ''

  const tr = (key: string) =>
    t.rich(key, {
      expense,
      participant,
      em: (chunks) => <em>&ldquo;{chunks}&rdquo;</em>,
      strong: (chunks) => <strong>{chunks}</strong>,
    })

  if (activity.activityType == ActivityType.UPDATE_GROUP) {
    return <>{tr('settingsModified')}</>
  } else if (activity.activityType == ActivityType.CREATE_EXPENSE) {
    return <>{tr('expenseCreated')}</>
  } else if (activity.activityType == ActivityType.UPDATE_EXPENSE) {
    return <>{tr('expenseUpdated')}</>
  } else if (activity.activityType == ActivityType.DELETE_EXPENSE) {
    return <>{tr('expenseDeleted')}</>
  } else if (activity.activityType == ActivityType.RESTORE_EXPENSE) {
    return <>{tr('expenseRestored')}</>
  }
}

export function ActivityItem({
  groupId,
  activity,
  participant,
  dateStyle,
}: Props) {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('Activity')
  const [expanded, setExpanded] = useState(false)
  const { group } = useCurrentGroup()
  const activeUserId = useActiveUser(groupId)
  const utils = trpc.useUtils()
  const { mutateAsync: restore, isPending: isRestoring } =
    trpc.groups.expenses.restore.useMutation()

  // `actorName` is captured when the entry is written, so it survives renames
  // and removals. Older entries fall back to the live participant.
  const actorName = activity.actorName ?? participant?.name
  const summary = useSummary(activity, actorName)

  const expense = activity.expense
  const isDeleted = expense?.deletedAt != null
  // A deleted expense has no page to open, but its history is still readable.
  const canOpenExpense = expense !== undefined && !isDeleted
  const hasDetail = activity.payload != null

  const onRestore = async () => {
    if (!activity.expenseId) return
    await restore({
      groupId,
      expenseId: activity.expenseId,
      participantId: activeUserId ?? undefined,
    })
    await utils.groups.invalidate()
    router.refresh()
  }

  return (
    <div className="sm:rounded-lg px-2 sm:pr-1 sm:pl-2 py-2 text-sm hover:bg-accent">
      <div className="flex justify-between gap-1 items-stretch">
        <div className="flex flex-col justify-between items-start">
          {dateStyle !== undefined && (
            <div className="mt-1 text-xs/5 text-muted-foreground">
              {formatDate(activity.time, locale, { dateStyle })}
            </div>
          )}
          <div className="my-1 text-xs/5 text-muted-foreground">
            {formatDate(activity.time, locale, { timeStyle: 'short' })}
          </div>
        </div>
        <div
          className={cn('flex-1', canOpenExpense && 'cursor-pointer')}
          onClick={() => {
            if (canOpenExpense) {
              router.push(
                `/groups/${groupId}/expenses/${activity.expenseId}/edit`,
              )
            }
          }}
        >
          <div className="m-1">{summary}</div>
        </div>
        {hasDetail && (
          <Button
            size="icon"
            variant="ghost"
            className="self-center w-6 h-6 shrink-0"
            aria-expanded={expanded}
            aria-label={expanded ? t('hideDetail') : t('showDetail')}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </Button>
        )}
        {canOpenExpense && (
          <Button
            size="icon"
            variant="link"
            className="self-center hidden sm:flex w-5 h-5"
            asChild
          >
            <Link
              href={`/groups/${groupId}/expenses/${activity.expenseId}/edit`}
            >
              <ChevronRight className="w-4 h-4" />
            </Link>
          </Button>
        )}
      </div>

      {expanded && group && (
        <div className="pl-1 pr-1 pb-1 sm:pl-2">
          <ActivityChanges
            payload={activity.payload}
            currency={getCurrencyFromGroup(group)}
          />
          {isDeleted &&
            activity.activityType === ActivityType.DELETE_EXPENSE && (
              <Button
                size="sm"
                variant="outline"
                className="mt-2 h-7 text-xs"
                disabled={isRestoring}
                onClick={onRestore}
              >
                <Undo2 className="w-3 h-3 mr-1" />
                {t('restore')}
              </Button>
            )}
        </div>
      )}
    </div>
  )
}
