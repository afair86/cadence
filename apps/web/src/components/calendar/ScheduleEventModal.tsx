import { useEffect, useState, type FormEvent } from 'react';
import type { Contact, ScheduleEventInput } from '@cadence/shared';
import { scheduleCalendarEvent } from '../../lib/api';
import './schedule-event-modal.scss';

const EVENT_TYPES: { value: ScheduleEventInput['eventType']; label: string }[] = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'call', label: 'Phone call' },
  { value: 'coffee', label: 'Coffee catch-up' },
  { value: 'site_visit', label: 'Site visit' },
  { value: 'message', label: 'Scheduled message' },
];

interface Props {
  contacts: Contact[];
  defaultDate?: Date;
  defaultContactId?: string;
  onClose: () => void;
  onSaved: () => void;
}

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function ScheduleEventModal({
  contacts,
  defaultDate,
  defaultContactId,
  onClose,
  onSaved,
}: Props) {
  const [contactId, setContactId] = useState(defaultContactId ?? contacts[0]?.id ?? '');
  const [eventType, setEventType] = useState<ScheduleEventInput['eventType']>('meeting');
  const [startsAt, setStartsAt] = useState(toLocalInputValue(defaultDate ?? new Date()));
  const [durationMin, setDurationMin] = useState('60');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (defaultContactId) setContactId(defaultContactId);
    if (defaultDate) setStartsAt(toLocalInputValue(defaultDate));
  }, [defaultContactId, defaultDate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!contactId) return;
    setSaving(true);
    setError('');
    try {
      await scheduleCalendarEvent({
        contactId,
        eventType,
        startsAt: new Date(startsAt).toISOString(),
        durationMin: durationMin ? Number(durationMin) : undefined,
        notes: notes.trim() || undefined,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="schedule-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="schedule-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="schedule-modal-title"
      >
        <header className="schedule-modal__header">
          <h2 id="schedule-modal-title">Schedule something</h2>
          <button type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <form onSubmit={handleSubmit} className="schedule-modal__form">
          <label>
            Contact
            <select value={contactId} onChange={(e) => setContactId(e.target.value)} required>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.company}
                </option>
              ))}
            </select>
          </label>

          <label>
            Type
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as ScheduleEventInput['eventType'])}
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Date &amp; time
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
          </label>

          <label>
            Duration (minutes)
            <input
              type="number"
              min={5}
              step={5}
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
            />
          </label>

          <label>
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional — agenda, location, message draft…"
            />
          </label>

          {error ? <p className="schedule-modal__error">{error}</p> : null}

          <div className="schedule-modal__actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="schedule-modal__save" disabled={saving || !contactId}>
              {saving ? 'Saving…' : 'Add to calendar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
