import { useState, useEffect, type FormEvent, useRef } from 'react';
import type { CreateContactInput, Sphere, SectionView } from '@cadence/shared';
import { SPHERE_LABELS, spheresForSection } from '@cadence/shared';
import { X, Upload, Smartphone } from 'lucide-react';
import { createContact } from '../../lib/api';
import {
  parseContactsCsv,
  parseVCard,
  pickDeviceContacts,
} from '../../lib/contactActions';
import { useContactActions } from '../../context/ContactActionContext';
import { useSection } from '../../context/SectionContext';
import './add-contact-modal.scss';

interface Props {
  onAdded?: () => void;
}

function defaultSphere(section: SectionView): Sphere {
  const spheres = spheresForSection(section);
  return spheres[0] ?? 'business';
}

export default function AddContactModal({ onAdded }: Props) {
  const { showAddContact, closeAddContact, notifyContactsChanged } = useContactActions();
  const { section } = useSection();
  const sphereOptions = spheresForSection(section);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<CreateContactInput>({
    name: '',
    company: '',
    phone: '',
    email: '',
    preferredMethod: 'call',
    sphere: defaultSphere(section),
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [importPreview, setImportPreview] = useState<CreateContactInput[]>([]);

  useEffect(() => {
    if (showAddContact) {
      const sphere = defaultSphere(section);
      setForm((prev) => ({ ...prev, sphere }));
    }
  }, [showAddContact, section]);

  if (!showAddContact) return null;

  function reset() {
    setForm({
      name: '',
      company: '',
      phone: '',
      email: '',
      preferredMethod: 'call',
      sphere: defaultSphere(section),
    });
    setImportPreview([]);
    setError('');
  }

  function handleClose() {
    reset();
    closeAddContact();
  }

  async function saveOne(input: CreateContactInput) {
    if (!input.name?.trim()) throw new Error('Name is required');
    await createContact({
      name: input.name.trim(),
      company: input.company?.trim() || '—',
      phone: input.phone?.trim() || undefined,
      email: input.email?.trim() || undefined,
      preferredMethod: input.preferredMethod ?? 'call',
      sphere: input.sphere ?? defaultSphere(section),
      whatsappPhone: input.whatsappPhone?.trim() || undefined,
      instagramHandle: input.instagramHandle?.trim() || undefined,
      facebookUsername: input.facebookUsername?.trim() || undefined,
      linkedinUrl: input.linkedinUrl?.trim() || undefined,
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await saveOne(form);
      notifyContactsChanged();
      onAdded?.();
      handleClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeviceImport() {
    setError('');
    setLoading(true);
    try {
      const picked = await pickDeviceContacts();
      setImportPreview(
        picked.map((p) => ({
          name: p.name,
          company: p.company || '',
          phone: p.phone,
          email: p.email,
          preferredMethod: p.phone ? 'call' : 'email',
          sphere: defaultSphere(section),
        })),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileImport(file: File) {
    setError('');
    const text = await file.text();
    const parsed =
      file.name.toLowerCase().endsWith('.csv')
        ? parseContactsCsv(text)
        : parseVCard(text);

    if (parsed.length === 0) {
      setError('No contacts found in that file.');
      return;
    }

    setImportPreview(
      parsed.map((p) => ({
        name: p.name,
        company: p.company || '',
        phone: p.phone,
        email: p.email,
        preferredMethod: p.phone ? 'call' : 'email',
        sphere: defaultSphere(section),
      })),
    );
  }

  async function importAll() {
    setError('');
    setLoading(true);
    try {
      for (const c of importPreview) {
        await saveOne(c);
      }
      notifyContactsChanged();
      onAdded?.();
      handleClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={handleClose} role="presentation">
      <div
        className="add-contact-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="add-contact-title"
      >
        <div className="add-contact-modal__header">
          <h2 id="add-contact-title">Add contact</h2>
          <button type="button" onClick={handleClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="add-contact-modal__import-row">
          <button type="button" onClick={handleDeviceImport} disabled={loading}>
            <Smartphone size={16} />
            Import from phone / computer contacts
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={loading}>
            <Upload size={16} />
            Upload .vcf or .csv
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".vcf,.csv,text/vcard,text/csv"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileImport(f);
              e.target.value = '';
            }}
          />
        </div>

        {importPreview.length > 0 ? (
          <div className="add-contact-modal__preview">
            <p>
              <strong>{importPreview.length}</strong> contact{importPreview.length > 1 ? 's' : ''}{' '}
              ready to import
            </p>
            <ul>
              {importPreview.slice(0, 5).map((c, i) => (
                <li key={i}>
                  {c.name} {c.phone || c.email ? `· ${c.phone || c.email}` : ''}
                </li>
              ))}
              {importPreview.length > 5 ? <li>…and {importPreview.length - 5} more</li> : null}
            </ul>
            <button type="button" className="add-contact-modal__submit" onClick={importAll} disabled={loading}>
              {loading ? 'Importing…' : `Import ${importPreview.length} contact${importPreview.length > 1 ? 's' : ''}`}
            </button>
            <button type="button" className="add-contact-modal__link" onClick={() => setImportPreview([])}>
              Add manually instead
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="add-contact-modal__form">
            {error ? <div className="add-contact-modal__error">{error}</div> : null}
            <label>
              Name *
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </label>
            <label>
              Company *
              <input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                required
              />
            </label>
            <label>
              Phone
              <input
                value={form.phone ?? ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={form.email ?? ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label>
              Preferred method
              <select
                value={form.preferredMethod}
                onChange={(e) =>
                  setForm({ ...form, preferredMethod: e.target.value as CreateContactInput['preferredMethod'] })
                }
              >
                <option value="call">Phone call</option>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
              </select>
            </label>
            {sphereOptions.length > 1 ? (
              <label>
                Life section
                <select
                  value={form.sphere ?? defaultSphere(section)}
                  onChange={(e) => setForm({ ...form, sphere: e.target.value as Sphere })}
                >
                  {sphereOptions.map((s) => (
                    <option key={s} value={s}>
                      {SPHERE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <details className="add-contact-modal__social">
              <summary>Social &amp; messaging apps</summary>
              <label>
                WhatsApp number (optional)
                <input
                  value={form.whatsappPhone ?? ''}
                  onChange={(e) => setForm({ ...form, whatsappPhone: e.target.value })}
                  placeholder="Same as phone if blank"
                />
              </label>
              <label>
                Instagram @handle
                <input
                  value={form.instagramHandle ?? ''}
                  onChange={(e) => setForm({ ...form, instagramHandle: e.target.value })}
                  placeholder="username"
                />
              </label>
              <label>
                Facebook Messenger username
                <input
                  value={form.facebookUsername ?? ''}
                  onChange={(e) => setForm({ ...form, facebookUsername: e.target.value })}
                  placeholder="m.me username"
                />
              </label>
              <label>
                LinkedIn profile URL or slug
                <input
                  value={form.linkedinUrl ?? ''}
                  onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
                  placeholder="linkedin.com/in/you or slug"
                />
              </label>
            </details>
            <button type="submit" className="add-contact-modal__submit" disabled={loading}>
              {loading ? 'Saving…' : 'Save contact'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
