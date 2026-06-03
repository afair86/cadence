import type { Contact, ContactMethod } from '@cadence/shared';
import { X, Copy, Phone, Mail, MessageSquare } from 'lucide-react';
import {
  actionLabel,
  channelHref,
  channelValue,
  copyText,
  tryOpenChannel,
} from '../../lib/contactActions';
import './contact-action-modal.scss';

interface Props {
  contact: Contact;
  action: ContactMethod;
  pointsEarned: number;
  onClose: () => void;
}

const icons = { call: Phone, sms: MessageSquare, email: Mail, meeting: Phone };

export default function ContactActionModal({ contact, action, pointsEarned, onClose }: Props) {
  const Icon = icons[action] ?? Phone;
  const value = channelValue(contact, action);
  const href = value ? channelHref(contact, action) : null;
  const label = actionLabel(action);

  async function handleCopy() {
    if (!value) return;
    const ok = await copyText(value);
    if (!ok) window.prompt('Copy this:', value);
  }

  function handleOpen() {
    if (href) tryOpenChannel(href);
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="contact-action-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="action-modal-title"
      >
        <div className="contact-action-modal__header">
          <div className="contact-action-modal__icon">
            <Icon size={20} />
          </div>
          <div>
            <h2 id="action-modal-title">{label} logged</h2>
            <p>
              +{pointsEarned} point{pointsEarned === 1 ? '' : 's'} · {contact.name}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {value ? (
          <div className="contact-action-modal__detail">
            <span className="contact-action-modal__label">
              {action === 'email' ? 'Email' : 'Phone'}
            </span>
            <strong>{value}</strong>
          </div>
        ) : (
          <p className="contact-action-modal__missing">
            No {action === 'email' ? 'email' : 'phone'} saved for this contact. Add it in Contacts.
          </p>
        )}

        <div className="contact-action-modal__actions">
          {value ? (
            <>
              <button type="button" className="contact-action-modal__primary" onClick={handleCopy}>
                <Copy size={16} />
                Copy {action === 'email' ? 'email' : 'number'}
              </button>
              {href ? (
                <button type="button" className="contact-action-modal__secondary" onClick={handleOpen}>
                  Open {label.toLowerCase()} app
                </button>
              ) : null}
            </>
          ) : null}
          <button type="button" className="contact-action-modal__done" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
