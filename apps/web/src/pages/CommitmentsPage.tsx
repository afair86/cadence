import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { Commitment, CommitmentsData, Contact } from '@cadence/shared';
import { SPHERE_LABELS } from '@cadence/shared';
import {
  confirmCommitment,
  completeCommitment,
  createCommitment,
  dismissCommitment,
  fetchCommitments,
  fetchContacts,
  scanCommitments,
} from '../lib/api';
import { useSection } from '../context/SectionContext';
import { Check, ClipboardList, Sparkles, X, Calendar, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import './commitments-page.scss';

function DirectionBadge({ direction }: { direction: Commitment['direction'] }) {
  return (
    <span className={`commitments-page__dir commitments-page__dir--${direction}`}>
      {direction === 'mine' ? (
        <>
          <ArrowUpRight size={12} /> You promised
        </>
      ) : (
        <>
          <ArrowDownLeft size={12} /> They asked
        </>
      )}
    </span>
  );
}

function CommitmentCard({
  item,
  onConfirm,
  onDone,
  onDismiss,
}: {
  item: Commitment;
  onConfirm?: () => void;
  onDone?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <li className={`commitments-page__card${item.overdue ? ' commitments-page__card--overdue' : ''}`}>
      <div className="commitments-page__card-top">
        <DirectionBadge direction={item.direction} />
        {item.sphere ? (
          <span className={`section-badge section-badge--${item.sphere}`}>
            {SPHERE_LABELS[item.sphere]}
          </span>
        ) : null}
        <time>{item.dueLabel}</time>
      </div>
      <strong>{item.title}</strong>
      <p className="commitments-page__who">
        {item.contactName}
        {item.company ? ` · ${item.company}` : ''}
      </p>
      {item.sourceQuote ? (
        <blockquote className="commitments-page__quote">&ldquo;{item.sourceQuote}&rdquo;</blockquote>
      ) : null}
      <div className="commitments-page__actions">
        {onConfirm ? (
          <button type="button" className="commitments-page__confirm" onClick={onConfirm}>
            <Check size={14} /> Add to calendar
          </button>
        ) : null}
        {onDone ? (
          <button type="button" className="commitments-page__done" onClick={onDone}>
            <Check size={14} /> Mark done
          </button>
        ) : null}
        {onDismiss ? (
          <button type="button" onClick={onDismiss}>
            <X size={14} /> Dismiss
          </button>
        ) : null}
        <Link to="/calendar" className="commitments-page__cal-link">
          <Calendar size={14} /> Calendar
        </Link>
      </div>
    </li>
  );
}

export default function CommitmentsPage() {
  const [data, setData] = useState<CommitmentsData | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [contactId, setContactId] = useState('');
  const [title, setTitle] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [scanText, setScanText] = useState('');
  const [notice, setNotice] = useState('');
  const { section, sectionLabel } = useSection();

  const load = useCallback(() => {
    fetchCommitments(section).then(setData).catch(() => setNotice('Could not load commitments'));
    fetchContacts(section).then((c) => {
      setContacts(c);
      setContactId((prev) => prev || c[0]?.id || '');
    });
  }, [section]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleConfirm(id: string) {
    await confirmCommitment(id);
    setNotice('Commitment added to your calendar.');
    load();
  }

  async function handleDone(id: string) {
    await completeCommitment(id);
    load();
  }

  async function handleDismiss(id: string) {
    await dismissCommitment(id);
    load();
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!title.trim() || !dueAt) return;
    await createCommitment({
      contactId: contactId || undefined,
      title: title.trim(),
      dueAt: new Date(dueAt).toISOString(),
      direction: 'mine',
    });
    setTitle('');
    setShowAdd(false);
    setNotice('Commitment saved.');
    load();
  }

  async function handleScan(e: FormEvent) {
    e.preventDefault();
    if (!scanText.trim()) return;
    const result = await scanCommitments({
      text: scanText.trim(),
      contactId: contactId || undefined,
      direction: 'theirs',
      source: 'manual',
    });
    setScanText('');
    setNotice(
      result.created > 0
        ? `Found ${result.created} commitment${result.created === 1 ? '' : 's'} — review below.`
        : 'No commitments detected in that text.',
    );
    load();
  }

  if (!data) {
    return <div className="commitments-page commitments-page--loading">Loading commitments…</div>;
  }

  return (
    <div className="commitments-page">
      <header className="commitments-page__header">
        <div>
          <h1>{sectionLabel} commitments</h1>
          <p>Promises and requests pulled from your messages — due dates on your calendar</p>
        </div>
        <button type="button" className="commitments-page__add-btn" onClick={() => setShowAdd((v) => !v)}>
          + Add commitment
        </button>
      </header>

      <div className={`commitments-page__ai-note${data.aiEnabled ? ' commitments-page__ai-note--on' : ''}`}>
        {data.aiEnabled ? (
          <>
            <Sparkles size={14} /> AI scans messages for &ldquo;I&apos;ll do X by…&rdquo; and &ldquo;can you…&rdquo;
            automatically
          </>
        ) : (
          <>
            <ClipboardList size={14} /> Smart pattern matching on messages — add OPENAI_API_KEY for deeper AI
            detection
          </>
        )}
      </div>

      {notice ? <p className="commitments-page__notice">{notice}</p> : null}

      {data.overdueCount > 0 ? (
        <p className="commitments-page__overdue-banner">
          {data.overdueCount} overdue commitment{data.overdueCount === 1 ? '' : 's'} — tackle these first
        </p>
      ) : null}

      {showAdd ? (
        <form className="commitments-page__form card" onSubmit={handleAdd}>
          <h2>Add commitment</h2>
          <label>
            What
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Send updated quote" required />
          </label>
          <label>
            Contact
            <select value={contactId} onChange={(e) => setContactId(e.target.value)}>
              <option value="">No contact</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.company}
                </option>
              ))}
            </select>
          </label>
          <label>
            Due by
            <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} required />
          </label>
          <button type="submit">Save</button>
        </form>
      ) : null}

      <form className="commitments-page__scan card" onSubmit={handleScan}>
        <h2>Scan a message</h2>
        <p>Paste any message to detect commitments</p>
        <textarea
          value={scanText}
          onChange={(e) => setScanText(e.target.value)}
          rows={3}
          placeholder={'e.g. "Can you update the proposal by Friday?" or "I\'ll get onto that tonight"'}
        />
        <button type="submit" disabled={!scanText.trim()}>
          Detect commitments
        </button>
      </form>

      <section className="commitments-page__section">
        <h2>Needs review ({data.suggested.length})</h2>
        <p className="commitments-page__section-note">Detected from messages — confirm to add to calendar</p>
        {data.suggested.length === 0 ? (
          <p className="commitments-page__empty">Nothing to review. Log incoming messages to auto-detect.</p>
        ) : (
          <ul className="commitments-page__list">
            {data.suggested.map((item) => (
              <CommitmentCard
                key={item.id}
                item={item}
                onConfirm={() => handleConfirm(item.id)}
                onDismiss={() => handleDismiss(item.id)}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="commitments-page__section">
        <h2>Open ({data.open.length})</h2>
        {data.open.length === 0 ? (
          <p className="commitments-page__empty">No open commitments.</p>
        ) : (
          <ul className="commitments-page__list">
            {data.open.map((item) => (
              <CommitmentCard
                key={item.id}
                item={item}
                onDone={() => handleDone(item.id)}
                onDismiss={() => handleDismiss(item.id)}
              />
            ))}
          </ul>
        )}
      </section>

      {data.done.length > 0 ? (
        <section className="commitments-page__section commitments-page__section--done">
          <h2>Recently done ({data.done.length})</h2>
          <ul className="commitments-page__list">
            {data.done.map((item) => (
              <CommitmentCard key={item.id} item={item} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
