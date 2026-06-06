import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { Contact, ContactMethod, InboundMessage, MessagesData, ScheduledMessage } from '@cadence/shared';
import { SPHERE_LABELS } from '@cadence/shared';
import {
  approveAutomation,
  cancelMessage,
  createActivity,
  fetchContacts,
  fetchMessages,
  generateMessageDraft,
  logInboundMessage,
  markInboxMessageRead,
  updateMessage,
} from '../lib/api';
import { useContactActions } from '../context/ContactActionContext';
import { useSection } from '../context/SectionContext';
import { Link } from 'react-router-dom';
import SendViaModal from '../components/messages/SendViaModal';
import type { MessagePlatform } from '@cadence/shared';
import { activityTypeForPlatform, platformLabel } from '@cadence/shared';
import { MESSAGE_PLATFORMS } from '@cadence/shared';
import { Mail, MessageSquare, Pencil, Sparkles, Trash2, X, Check, Send, Inbox, Reply, RefreshCw } from 'lucide-react';
import './messages-page.scss';

const channelLabels: Record<ContactMethod, string> = {
  call: 'Call',
  sms: 'Text',
  email: 'Email',
  meeting: 'Meeting',
};

function draftChannelForPlatform(platform: MessagePlatform): 'sms' | 'email' {
  return platform === 'email' ? 'email' : 'sms';
}

export default function MessagesPage() {
  const [data, setData] = useState<MessagesData | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactId, setContactId] = useState('');
  const [channel, setChannel] = useState<'sms' | 'email'>('sms');
  const [drafting, setDrafting] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [sendVia, setSendVia] = useState<{ msg: ScheduledMessage; contact: Contact } | null>(null);
  const [inboundBody, setInboundBody] = useState('');
  const [inboundPlatform, setInboundPlatform] = useState<MessagePlatform>('sms');
  const [loggingInbound, setLoggingInbound] = useState(false);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [highlightDraftId, setHighlightDraftId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const queuedRef = useRef<HTMLElement>(null);
  const { section, sectionLabel } = useSection();
  const { contactsVersion } = useContactActions();

  const load = useCallback(() => {
    fetchMessages(section).then(setData).catch(() => setError('Could not load messages'));
    fetchContacts(section).then((c) => {
      setContacts(c);
      setContactId((prev) => prev || c[0]?.id || '');
    });
  }, [section]);

  useEffect(() => {
    load();
  }, [load, contactsVersion, section]);

  useEffect(() => {
    if (!highlightDraftId) return;
    const t = setTimeout(() => setHighlightDraftId(null), 3000);
    return () => clearTimeout(t);
  }, [highlightDraftId]);

  async function handleDraft() {
    if (!contactId) return;
    setDrafting(true);
    setError('');
    try {
      await generateMessageDraft(contactId, channel);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDrafting(false);
    }
  }

  async function handleApprove(id: string) {
    await approveAutomation(id);
    load();
  }

  async function handleCancel(id: string) {
    await cancelMessage(id);
    load();
  }

  function startEdit(msg: ScheduledMessage) {
    setEditingId(msg.id);
    setEditText(msg.message);
  }

  async function saveEdit(id: string) {
    if (!editText.trim()) return;
    await updateMessage(id, editText.trim());
    setEditingId(null);
    load();
  }

  async function handleSentVia(platform: MessagePlatform) {
    if (!sendVia) return;
    const { msg, contact } = sendVia;
    await createActivity({
      contactId: contact.id,
      type: activityTypeForPlatform(platform),
      notes: `[${platformLabel(platform)}] ${msg.message}`,
    });
    await cancelMessage(msg.id);
    load();
  }

  async function handleLogInbound(e: FormEvent) {
    e.preventDefault();
    if (!contactId || !inboundBody.trim()) return;
    setLoggingInbound(true);
    setError('');
    try {
      const result = await logInboundMessage({
        contactId,
        platform: inboundPlatform,
        body: inboundBody.trim(),
      }) as { commitments?: { length: number } };
      setInboundBody('');
      if (result.commitments?.length) {
        setNotice({
          type: 'success',
          message: `Saved — ${result.commitments.length} commitment${result.commitments.length === 1 ? '' : 's'} detected. Check Commitments.`,
        });
      }
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoggingInbound(false);
    }
  }

  async function handleMarkRead(id: string) {
    await markInboxMessageRead(id);
    load();
  }

  async function handleReply(msg: InboundMessage) {
    if (!msg.contactId || replyingId) return;
    const replyChannel = draftChannelForPlatform(msg.platform);
    setReplyingId(msg.id);
    setNotice(null);
    setError('');
    try {
      if (msg.status === 'unread') {
        await markInboxMessageRead(msg.id);
      }
      const draft = await generateMessageDraft(msg.contactId, replyChannel, msg.body);
      setContactId(msg.contactId);
      setChannel(replyChannel);
      setHighlightDraftId(draft.id);
      setNotice({
        type: 'success',
        message: `Reply draft ready for ${msg.contactName} — scroll down to review and send.`,
      });
      await load();
      queuedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      const message = (err as Error).message || 'Could not create reply draft. Try signing in again.';
      setNotice({ type: 'error', message });
      setError(message);
    } finally {
      setReplyingId(null);
    }
  }

  if (!data) {
    return <div className="messages-page messages-page--loading">Loading messages…</div>;
  }

  return (
    <div className="messages-page">
      <header className="messages-page__header">
        <div>
          <h1>{sectionLabel} messages</h1>
          <p>Incoming and outgoing — one place for every conversation</p>
        </div>
        <span className="messages-page__count">
          {data.unreadCount > 0 ? `${data.unreadCount} new · ` : ''}
          {data.upcoming.length} queued
        </span>
      </header>

      {notice ? (
        <p className={`messages-page__notice messages-page__notice--${notice.type}`} role="status">
          {notice.message}
        </p>
      ) : null}
      {error && !notice ? (
        <p className="messages-page__notice messages-page__notice--error" role="alert">
          {error}
        </p>
      ) : null}

      <Link to="/settings" className="messages-page__sync-banner">
        <RefreshCw size={18} />
        <span>
          <strong>Auto-sync calls, texts &amp; email</strong>
          <span>Set up in Settings — messages and calls log automatically</span>
        </span>
      </Link>

      <section className="messages-page__section">
        <h2>
          <Inbox size={16} /> Incoming ({data.inbound.length})
          {data.unreadCount > 0 ? (
            <span className="messages-page__unread-pill">{data.unreadCount} new</span>
          ) : null}
        </h2>
        {data.inbound.length === 0 ? (
          <p className="messages-page__empty">No incoming messages yet. Log one below.</p>
        ) : (
          <ul className="messages-page__list">
            {data.inbound.map((msg) => (
              <li
                key={msg.id}
                className={`messages-page__card messages-page__card--inbound${msg.status === 'unread' ? ' messages-page__card--unread' : ''}`}
              >
                <div className="messages-page__card-top">
                  <div>
                    <strong>{msg.contactName}</strong>
                    <span>{msg.company}</span>
                  </div>
                  <div className="messages-page__card-meta">
                    {msg.sphere ? (
                      <span className={`section-badge section-badge--${msg.sphere}`}>
                        {SPHERE_LABELS[msg.sphere]}
                      </span>
                    ) : null}
                    <span className="messages-page__channel">{platformLabel(msg.platform)}</span>
                    <time>{msg.receivedAt}</time>
                  </div>
                </div>
                <p className="messages-page__body messages-page__body--plain messages-page__body--inbound">
                  {msg.body}
                </p>
                <div className="messages-page__actions">
                  {msg.status === 'unread' ? (
                    <button type="button" onClick={() => handleMarkRead(msg.id)}>
                      Mark read
                    </button>
                  ) : null}
                  {msg.contactId ? (
                    <button
                      type="button"
                      className="messages-page__approve messages-page__reply-btn"
                      onClick={() => handleReply(msg)}
                      disabled={replyingId === msg.id}
                    >
                      <Reply size={14} /> {replyingId === msg.id ? 'Drafting…' : 'Draft reply'}
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="messages-page__compose messages-page__compose--capture">
        <h2>Log incoming message</h2>
        <p className="messages-page__compose-note">
          Copy a message from iMessage, WhatsApp, Instagram, etc. and save it here
        </p>
        <form className="messages-page__compose-row" onSubmit={handleLogInbound}>
          <label>
            From
            <select value={contactId} onChange={(e) => setContactId(e.target.value)}>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.company}
                </option>
              ))}
            </select>
          </label>
          <label>
            Platform
            <select
              value={inboundPlatform}
              onChange={(e) => setInboundPlatform(e.target.value as MessagePlatform)}
            >
              {MESSAGE_PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="messages-page__capture-text">
            Message received
            <textarea
              value={inboundBody}
              onChange={(e) => setInboundBody(e.target.value)}
              rows={3}
              placeholder="Paste what they sent you…"
              required
            />
          </label>
          <button type="submit" className="messages-page__draft-btn" disabled={loggingInbound || !contactId}>
            {loggingInbound ? 'Saving…' : 'Save to inbox'}
          </button>
        </form>
      </section>

      <section className="messages-page__compose">
        <h2>Draft outgoing message</h2>
        <p className="messages-page__compose-note">
          {data.aiEnabled ? (
            <>
              <Sparkles size={14} /> AI will suggest wording — no copy/paste needed
            </>
          ) : (
            'Smart templates used — add OPENAI_API_KEY for AI drafts'
          )}
        </p>
        <div className="messages-page__compose-row">
          <label>
            To
            <select value={contactId} onChange={(e) => setContactId(e.target.value)}>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.company}
                </option>
              ))}
            </select>
          </label>
          <label>
            Via
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as 'sms' | 'email')}
            >
              <option value="sms">Text (SMS)</option>
              <option value="email">Email</option>
            </select>
          </label>
          <button
            type="button"
            className="messages-page__draft-btn"
            onClick={handleDraft}
            disabled={drafting || !contactId}
          >
            {drafting ? 'Drafting…' : 'Draft message'}
          </button>
        </div>
        {error ? <p className="messages-page__error">{error}</p> : null}
      </section>

      <section className="messages-page__section" ref={queuedRef}>
        <h2>Queued ({data.upcoming.length})</h2>
        {data.upcoming.length === 0 ? (
          <p className="messages-page__empty">No messages waiting. Draft one above.</p>
        ) : (
          <ul className="messages-page__list">
            {data.upcoming.map((msg) => (
              <li
                key={msg.id}
                className={`messages-page__card${highlightDraftId === msg.id ? ' messages-page__card--highlight' : ''}`}
              >
                <div className="messages-page__card-top">
                  <div>
                    <strong>{msg.contactName}</strong>
                    <span>{msg.company}</span>
                  </div>
                  <div className="messages-page__card-meta">
                    <span className={`section-badge section-badge--${msg.sphere}`}>
                      {SPHERE_LABELS[msg.sphere]}
                    </span>
                    <span className="messages-page__channel">
                      {msg.channel === 'email' ? <Mail size={14} /> : <MessageSquare size={14} />}
                      {channelLabels[msg.channel]}
                    </span>
                    <time>{msg.scheduledFor}</time>
                  </div>
                </div>

                {editingId === msg.id ? (
                  <div className="messages-page__edit">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                    />
                    <div className="messages-page__edit-actions">
                      <button type="button" onClick={() => setEditingId(null)}>
                        <X size={14} /> Cancel
                      </button>
                      <button type="button" className="messages-page__save" onClick={() => saveEdit(msg.id)}>
                        <Check size={14} /> Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <blockquote className="messages-page__body">&ldquo;{msg.message}&rdquo;</blockquote>
                )}

                {msg.insight ? <p className="messages-page__insight">{msg.insight}</p> : null}
                <p className="messages-page__status">
                  {msg.status === 'pending' ? 'Awaiting your approval' : 'Approved — scheduled to send'}
                </p>

                {editingId !== msg.id ? (
                  <div className="messages-page__actions">
                    <button type="button" onClick={() => startEdit(msg)}>
                      <Pencil size={14} /> Edit
                    </button>
                    <button type="button" onClick={() => handleCancel(msg.id)}>
                      <Trash2 size={14} /> Cancel
                    </button>
                    <button
                      type="button"
                      className="messages-page__approve"
                      onClick={() => {
                        const contact = contacts.find((c) => c.id === msg.contactId);
                        if (contact) setSendVia({ msg, contact });
                      }}
                    >
                      <Send size={14} /> Send via…
                    </button>
                    {msg.status === 'pending' ? (
                      <button type="button" onClick={() => handleApprove(msg.id)}>
                        Approve for later
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="messages-page__section">
        <h2>Recently sent ({data.sent.length})</h2>
        {data.sent.length === 0 ? (
          <p className="messages-page__empty">Sent texts and emails will show up here.</p>
        ) : (
          <ul className="messages-page__list messages-page__list--sent">
            {data.sent.map((msg) => (
              <li key={msg.id} className="messages-page__card messages-page__card--sent">
                <div className="messages-page__card-top">
                  <div>
                    <strong>{msg.contactName}</strong>
                    <span>{msg.company}</span>
                  </div>
                  <time>{msg.sentAt}</time>
                </div>
                <p className="messages-page__body messages-page__body--plain">{msg.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {sendVia ? (
        <SendViaModal
          contact={sendVia.contact}
          message={sendVia.msg.message}
          onClose={() => setSendVia(null)}
          onSent={handleSentVia}
        />
      ) : null}
    </div>
  );
}
