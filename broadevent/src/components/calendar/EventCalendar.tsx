// src/components/calendar/EventCalendar.tsx
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import koLocale from '@fullcalendar/core/locales/ko'
import { useAppStore } from '@/store'
import type { BroadEvent } from '@/types'

interface Props { onEventClick?: (eventId: string) => void }

export default function EventCalendar({ onEventClick }: Props) {
  const events = useAppStore((s) => s.events)

  const calEvents = events.map((ev: BroadEvent) => ({
    id: ev.id,
    title: ev.name,
    start: ev.startDate,
    end: shiftEnd(ev.endDate),
    backgroundColor: ev.country === 'international' ? '#2563EB' : '#DC2626',
    borderColor:     ev.country === 'international' ? '#2563EB' : '#DC2626',
    extendedProps: { country: ev.country },
  }))

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={koLocale}
        headerToolbar={{ left: 'prev', center: 'title', right: 'next' }}
        events={calEvents}
        height="auto"
        eventContent={renderEventContent}
        eventClick={(info) => onEventClick?.(info.event.id)}
        dayMaxEvents={3}
        moreLinkText={(n) => `+${n}건 더 보기`}
      />
    </div>
  )
}

function renderEventContent(info: { event: { title: string; extendedProps: { country: string } } }) {
  const isDom = info.event.extendedProps.country === 'domestic'
  const badge = isDom
    ? <span className="text-[9px] font-bold bg-broadcast-red  text-white rounded px-1 mr-0.5 flex-shrink-0">국내</span>
    : <span className="text-[9px] font-bold bg-broadcast-blue text-white rounded px-1 mr-0.5 flex-shrink-0">해외</span>
  const title = info.event.title.length > 10 ? info.event.title.slice(0, 10) + '…' : info.event.title
  return (
    <div className="flex items-center overflow-hidden w-full">
      {badge}
      <span className="text-[11px] truncate">{title}</span>
    </div>
  )
}

function shiftEnd(dateStr: string): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}
