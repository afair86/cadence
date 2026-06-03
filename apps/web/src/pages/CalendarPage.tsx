import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CalendarData, CalendarEvent } from '@cadence/shared';
import { SPHERE_LABELS, googleCalendarUrl, outlookCalendarUrl } from '@cadence/shared';
import {
  fetchCalendar,
  fetchContacts,
  planCalendarWeek,
  rescheduleCalendarEvent,
} from '../lib/api';
import { useSection } from '../context/SectionContext';
import ScheduleEventModal from '../components/calendar/ScheduleEventModal';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Plus,
  Sparkles,
} from 'lucide-react';
import './calendar-page.scss';

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

function formatWeekRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 6);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `${weekStart.toLocaleDateString('en-AU', opts)} – ${weekEnd.toLocaleDateString('en-AU', { ...opts, year: 'numeric' })}`;
}

function formatDayHeading(date: Date): string {
  const today = new Date();
  if (sameDay(date, today)) return 'Today';
  return date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-AU', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function kindLabel(event: CalendarEvent): string {
  if (event.kind === 'commitment') {
    return event.eventType === 'promise' ? 'Your promise' : 'Their request';
  }
  if (event.kind === 'message') return 'Message';
  if (event.kind === 'task') return 'Smart task';
  if (event.eventType === 'meeting') return 'Meeting';
  if (event.eventType === 'coffee') return 'Coffee';
  if (event.eventType === 'call') return 'Call';
  return 'Activity';
}

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [data, setData] = useState<CalendarData | null>(null);
  const [contacts, setContacts] = useState<Awaited<ReturnType<typeof fetchContacts>>>([]);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [planning, setPlanning] = useState(false);
  const [notice, setNotice] = useState('');
  const [moveTime, setMoveTime] = useState('');
  const { section, sectionLabel } = useSection();

  const load = useCallback(() => {
    fetchCalendar(section, weekStart.toISOString())
      .then(setData)
      .catch(() => setNotice('Could not load calendar'));
    fetchContacts(section).then(setContacts);
  }, [section, weekStart]);

  useEffect(() => {
    load();
  }, [load]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const day of days) {
      map.set(day.toDateString(), []);
    }
    for (const event of data?.events ?? []) {
      const key = new Date(event.startsAt).toDateString();
      if (map.has(key)) map.get(key)!.push(event);
    }
    return map;
  }, [data, days]);

  async function handlePlanWeek() {
    setPlanning(true);
    setNotice('');
    try {
      const result = await planCalendarWeek(section);
      setNotice(`Added ${result.created} tasks from your smart plan to the calendar.`);
      load();
    } catch (err) {
      setNotice((err as Error).message);
    } finally {
      setPlanning(false);
    }
  }

  async function handleReschedule(event: CalendarEvent, newStart: string) {
    if (!event.editable || event.kind === 'task') return;
    const kind = event.kind as 'message' | 'activity' | 'commitment';
    await rescheduleCalendarEvent({
      kind,
      id: event.id,
      startsAt: newStart,
      durationMin: event.durationMin,
    });
    setSelected(null);
    load();
  }

  function openSchedule(day?: Date) {
    setScheduleDate(day);
    setShowSchedule(true);
  }

  if (!data) {
    return <div className="calendar-page calendar-page--loading">Loading calendar…</div>;
  }

  return (
    <div className="calendar-page">
      <header className="calendar-page__header">
        <div>
          <h1>{sectionLabel} calendar</h1>
          <p>Meetings, messages &amp; follow-ups in one view</p>
        </div>
        <div className="calendar-page__header-actions">
          <button type="button" className="calendar-page__plan" onClick={handlePlanWeek} disabled={planning}>
            <Sparkles size={14} />
            {planning ? 'Planning…' : 'Plan my week'}
          </button>
          <button type="button" className="calendar-page__add" onClick={() => openSchedule()}>
            <Plus size={14} /> Schedule
          </button>
        </div>
      </header>

      {notice ? <p className="calendar-page__notice">{notice}</p> : null}

      <div className="calendar-page__summary">
        <span>{data.summary.meetings} meetings</span>
        <span>{data.summary.messages} messages</span>
        <span>{data.summary.tasks} smart tasks today</span>
        {data.summary.commitments > 0 ? (
          <span>{data.summary.commitments} commitments</span>
        ) : null}
      </div>

      <div className="calendar-page__nav">
        <button type="button" onClick={() => setWeekStart((w) => addDays(w, -7))} aria-label="Previous week">
          <ChevronLeft size={18} />
        </button>
        <div className="calendar-page__nav-center">
          <CalendarDays size={16} />
          <strong>{formatWeekRange(weekStart)}</strong>
        </div>
        <button type="button" onClick={() => setWeekStart(startOfWeek(new Date()))}>
          Today
        </button>
        <button type="button" onClick={() => setWeekStart((w) => addDays(w, 7))} aria-label="Next week">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="calendar-page__week">
        {days.map((day) => {
          const key = day.toDateString();
          const events = eventsByDay.get(key) ?? [];
          const isToday = sameDay(day, new Date());

          return (
            <section
              key={key}
              className={`calendar-page__day${isToday ? ' calendar-page__day--today' : ''}`}
            >
              <header className="calendar-page__day-head">
                <div>
                  <strong>{formatDayHeading(day)}</strong>
                  <span>{events.length} item{events.length === 1 ? '' : 's'}</span>
                </div>
                <button type="button" onClick={() => openSchedule(day)} aria-label="Add event">
                  <Plus size={14} />
                </button>
              </header>

              {events.length === 0 ? (
                <p className="calendar-page__empty">Nothing scheduled</p>
              ) : (
                <ul className="calendar-page__events">
                  {events.map((event) => (
                    <li key={`${event.kind}-${event.id}`}>
                      <button
                        type="button"
                        className={`calendar-page__event calendar-page__event--${event.kind}`}
                        onClick={() => {
                          setSelected(event);
                          setMoveTime(toLocalInputValue(event.startsAt));
                        }}
                      >
                        <time>{formatTime(event.startsAt)}</time>
                        <span className="calendar-page__event-title">{event.title}</span>
                        <span className="calendar-page__event-meta">{kindLabel(event)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <p className="calendar-page__tip">
        Tip: Smart tasks show on <strong>today</strong> only. Click <strong>Plan my week</strong> to
        turn them into real calendar slots. Export any event to Google or Outlook from its detail
        panel.
      </p>

      {selected ? (
        <div className="calendar-page__detail-backdrop" onClick={() => setSelected(null)} role="presentation">
          <div className="calendar-page__detail" onClick={(e) => e.stopPropagation()} role="dialog">
            <header>
              <div>
                <span className={`calendar-page__detail-kind calendar-page__detail-kind--${selected.kind}`}>
                  {kindLabel(selected)}
                </span>
                <h2>{selected.title}</h2>
                {selected.contactName ? (
                  <p>
                    {selected.contactName}
                    {selected.company ? ` · ${selected.company}` : ''}
                  </p>
                ) : null}
              </div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Close">
                ×
              </button>
            </header>

            <dl className="calendar-page__detail-grid">
              <div>
                <dt>When</dt>
                <dd>
                  {new Date(selected.startsAt).toLocaleString('en-AU', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                  {' · '}
                  {selected.durationMin} min
                </dd>
              </div>
              {selected.sphere ? (
                <div>
                  <dt>Section</dt>
                  <dd>
                    <span className={`section-badge section-badge--${selected.sphere}`}>
                      {SPHERE_LABELS[selected.sphere]}
                    </span>
                  </dd>
                </div>
              ) : null}
              {selected.subtitle ? (
                <div>
                  <dt>Details</dt>
                  <dd>{selected.subtitle}</dd>
                </div>
              ) : null}
              {selected.insight ? (
                <div>
                  <dt>Why</dt>
                  <dd>{selected.insight}</dd>
                </div>
              ) : null}
            </dl>

            <div className="calendar-page__detail-actions">
              {selected.link ? (
                <Link to={selected.link} className="calendar-page__detail-link">
                  Open in Cadence
                </Link>
              ) : null}
              <a
                href={googleCalendarUrl({
                  title: selected.title,
                  startsAt: new Date(selected.startsAt),
                  endsAt: new Date(selected.endsAt),
                  details: selected.subtitle ?? selected.insight,
                })}
                target="_blank"
                rel="noreferrer"
                className="calendar-page__detail-export"
              >
                <ExternalLink size={14} /> Google Calendar
              </a>
              <a
                href={outlookCalendarUrl({
                  title: selected.title,
                  startsAt: new Date(selected.startsAt),
                  endsAt: new Date(selected.endsAt),
                  details: selected.subtitle ?? selected.insight,
                })}
                target="_blank"
                rel="noreferrer"
                className="calendar-page__detail-export"
              >
                <ExternalLink size={14} /> Outlook
              </a>
            </div>

            {selected.editable ? (
              <div className="calendar-page__reschedule">
                <span>Move to</span>
                <div className="calendar-page__reschedule-row">
                  <input
                    type="datetime-local"
                    value={moveTime}
                    onChange={(e) => setMoveTime(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!moveTime) return;
                      handleReschedule(selected, new Date(moveTime).toISOString());
                    }}
                  >
                    Update
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {showSchedule ? (
        <ScheduleEventModal
          contacts={contacts}
          defaultDate={scheduleDate}
          onClose={() => setShowSchedule(false)}
          onSaved={() => {
            setNotice('Added to your calendar.');
            load();
          }}
        />
      ) : null}
    </div>
  );
}
