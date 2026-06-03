import type { Contact, MessagePlatform } from '@cadence/shared';
import {
  MESSAGE_PLATFORMS,
  buildPlatformUrl,
  getAvailablePlatforms,
} from '@cadence/shared';
import { X } from 'lucide-react';
import { copyText, tryOpenChannel } from '../../lib/contactActions';
import './send-via-modal.scss';

interface Props {
  contact: Contact;
  message: string;
  onClose: () => void;
  onSent: (platform: MessagePlatform) => void;
}

export default function SendViaModal({ contact, message, onClose, onSent }: Props) {
  const available = getAvailablePlatforms(contact);

  async function handleSend(platform: MessagePlatform) {
    const url = buildPlatformUrl(platform, contact, message);
    const copied = await copyText(message);
    if (url) {
      tryOpenChannel(url);
    }
    onSent(platform);
    onClose();
    if (!copied && !url) {
      window.prompt('Copy this message:', message);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="send-via-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="send-via-title"
      >
        <div className="send-via-modal__header">
          <div>
            <h2 id="send-via-title">Send via…</h2>
            <p>
              To {contact.name} · message copied, then your app opens
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <blockquote className="send-via-modal__preview">&ldquo;{message}&rdquo;</blockquote>

        {available.length === 0 ? (
          <p className="send-via-modal__empty">
            Add a phone, email, or social handle on this contact to send from Cadence.
          </p>
        ) : (
          <ul className="send-via-modal__list">
            {MESSAGE_PLATFORMS.filter((p) => available.includes(p.id)).map((p) => (
              <li key={p.id}>
                <button type="button" className="send-via-modal__platform" onClick={() => handleSend(p.id)}>
                  <strong>{p.label}</strong>
                  <span>{p.description}</span>
                  {!p.canPrefillMessage ? (
                    <em>Opens app — paste from clipboard</em>
                  ) : (
                    <em>Opens with your draft</em>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        <p className="send-via-modal__note">
          Cadence opens each app on your device. True inbox sync needs each platform&apos;s business
          API (coming later for WhatsApp Business, LinkedIn, etc.).
        </p>
      </div>
    </div>
  );
}
