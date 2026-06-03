import { useCallback, useEffect, useState } from 'react';
import type { Contact, ContactMethod } from '@cadence/shared';
import { fetchContacts } from '../lib/api';
import { useContactActions } from '../context/ContactActionContext';
import { useSection } from '../context/SectionContext';
import { SPHERE_LABELS } from '@cadence/shared';
import { Phone, Mail, MessageSquare, Plus } from 'lucide-react';
import './contacts-page.scss';

const healthColors = {
  healthy: '#22c55e',
  cooling: '#f59e0b',
  at_risk: '#ef4444',
};

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const { runContactAction, openAddContact, contactsVersion } = useContactActions();
  const { section, sectionLabel } = useSection();

  const load = useCallback(() => {
    fetchContacts(section).then(setContacts);
  }, [section]);

  useEffect(() => {
    load();
  }, [load, contactsVersion, section]);

  async function handleAction(contactId: string, action: ContactMethod) {
    const ok = await runContactAction(contactId, action);
    if (ok) load();
  }

  return (
    <div className="contacts-page">
      <header className="contacts-page__header">
        <div>
          <h1>{sectionLabel} contacts</h1>
          <p>{contacts.length} relationships in your network</p>
        </div>
        <button type="button" className="contacts-page__add" onClick={openAddContact}>
          <Plus size={16} />
          Add Contact
        </button>
      </header>

      <div className="contacts-page__list">
        {contacts.map((contact) => (
          <article key={contact.id} className="contact-card">
            <div className="contact-card__avatar">{contact.name.charAt(0)}</div>
            <div className="contact-card__body">
              <div className="contact-card__top">
                <div>
                  <strong>{contact.name}</strong>
                  <span>{contact.company}</span>
                </div>
                <span
                  className="contact-card__health"
                  style={{ color: healthColors[contact.healthStatus] }}
                >
                  {contact.healthScore}% · {contact.healthStatus.replace('_', ' ')}
                </span>
              </div>
              <p className="contact-card__meta">
                Last contact {contact.lastContactDaysAgo ?? '—'} days ago · Prefers{' '}
                {contact.preferredMethod}
              </p>
              {contact.preferredTimes ? (
                <p className="contact-card__times">{contact.preferredTimes}</p>
              ) : null}
              <div className="contact-card__tags">
                <span className={`section-badge section-badge--${contact.sphere}`}>
                  {SPHERE_LABELS[contact.sphere]}
                </span>
                {contact.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>
            <div className="contact-card__actions">
              <button
                type="button"
                aria-label="Call"
                title="Call"
                onClick={() => handleAction(contact.id, 'call')}
              >
                <Phone size={16} />
              </button>
              <button
                type="button"
                aria-label="SMS"
                title="Text"
                onClick={() => handleAction(contact.id, 'sms')}
              >
                <MessageSquare size={16} />
              </button>
              <button
                type="button"
                aria-label="Email"
                title="Email"
                onClick={() => handleAction(contact.id, 'email')}
              >
                <Mail size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
