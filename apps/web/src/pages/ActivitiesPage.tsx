import { useEffect, useState, type FormEvent } from 'react';
import type { Activity, ActivityType, Contact } from '@cadence/shared';
import { DEFAULT_POINTS } from '@cadence/shared';
import { createActivity, fetchActivities, fetchContacts } from '../lib/api';
import { useSection } from '../context/SectionContext';
import './activities-page.scss';

const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: 'call', label: 'Phone call' },
  { value: 'sms', label: 'SMS / Text' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'coffee', label: 'Coffee' },
  { value: 'site_visit', label: 'Site visit' },
  { value: 'quote', label: 'Quote sent' },
  { value: 'note', label: 'Note' },
];

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactId, setContactId] = useState('');
  const [type, setType] = useState<ActivityType>('call');
  const [durationMin, setDurationMin] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { section, sectionLabel } = useSection();

  function load() {
    fetchActivities(section).then(setActivities);
    fetchContacts(section).then((c) => {
      setContacts(c);
      if (c.length && !contactId) setContactId(c[0].id);
    });
  }

  useEffect(() => {
    load();
  }, [section]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!contactId) return;
    setLoading(true);
    setMessage('');
    try {
      await createActivity({
        contactId,
        type,
        durationMin: durationMin ? Number(durationMin) : undefined,
        notes: notes || undefined,
      });
      setNotes('');
      setDurationMin('');
      setMessage(`Logged! +${DEFAULT_POINTS[type]} pts (approx)`);
      load();
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="activities-page">
      <header className="activities-page__header">
        <h1>{sectionLabel} activities</h1>
        <p>Log interactions and earn KPI points for this section</p>
      </header>

      <div className="activities-page__grid">
        <form className="activities-page__form card" onSubmit={handleSubmit}>
          <h2>Log activity</h2>
          {message ? <p className="activities-page__msg">{message}</p> : null}

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
            <select value={type} onChange={(e) => setType(e.target.value as ActivityType)}>
              {ACTIVITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label} ({DEFAULT_POINTS[t.value]} pts)
                </option>
              ))}
            </select>
          </label>

          <label>
            Duration (minutes)
            <input
              type="number"
              min={1}
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              placeholder="Optional"
            />
          </label>

          <label>
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Outcome, next steps…"
            />
          </label>

          <button type="submit" disabled={loading || !contactId}>
            {loading ? 'Saving…' : 'Log activity'}
          </button>
        </form>

        <section className="activities-page__list card">
          <h2>Recent activity</h2>
          {activities.length === 0 ? (
            <p className="activities-page__empty">No activities logged yet.</p>
          ) : (
            <ul>
              {activities.map((a) => (
                <li key={a.id}>
                  <div>
                    <strong>{a.contactName}</strong>
                    <span>{a.company}</span>
                  </div>
                  <div className="activities-page__meta">
                    <span className="activities-page__type">{a.type.replace('_', ' ')}</span>
                    <span>+{a.points} pts</span>
                    <time>{new Date(a.occurredAt).toLocaleString()}</time>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
