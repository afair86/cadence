import { useState, useEffect, type FormEvent, useRef, type DragEvent } from 'react';
import type { CreateContactInput, Sphere, SectionView } from '@cadence/shared';
import { SPHERE_LABELS, spheresForSection } from '@cadence/shared';
import { X, Upload, Smartphone, Download, UserPlus, FileSpreadsheet } from 'lucide-react';
import { createContact, importContacts } from '../../lib/api';
import { pickDeviceContacts, getDeviceContactImportMode } from '../../lib/contactActions';
import {
  parseContactFile,
  downloadContactTemplate,
  type ParsedContactRow,
} from '../../lib/contactImport';
import { useContactActions } from '../../context/ContactActionContext';
import { useSection } from '../../context/SectionContext';
import './add-contact-modal.scss';

interface Props {
  onAdded?: () => void;
}

type ModalTab = 'import' | 'manual';

function defaultSphere(section: SectionView): Sphere {
  const spheres = spheresForSection(section);
  return spheres[0] ?? 'business';
}

function toCreateInput(row: ParsedContactRow, section: SectionView): CreateContactInput {
  const sphere = defaultSphere(section);
  return {
    name: row.name,
    company: row.company?.trim() || '—',
    phone: row.phone,
    email: row.email,
    preferredMethod: row.phone ? 'call' : 'email',
    sphere,
  };
}

export default function AddContactModal({ onAdded }: Props) {
  const { showAddContact, closeAddContact, notifyContactsChanged, showToast } = useContactActions();
  const { section } = useSection();
  const sphereOptions = spheresForSection(section);
  const fileRef = useRef<HTMLInputElement>(null);
  const vcfRef = useRef<HTMLInputElement>(null);
  const phoneImportMode = getDeviceContactImportMode();
  const [showPhoneImportHelp, setShowPhoneImportHelp] = useState(false);
  const [tab, setTab] = useState<ModalTab>('import');
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
  const [importProgress, setImportProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [importFileName, setImportFileName] = useState('');

  useEffect(() => {
    if (showAddContact) {
      const sphere = defaultSphere(section);
      setForm((prev) => ({ ...prev, sphere }));
    }
  }, [showAddContact, section]);

  if (!showAddContact) return null;

  function reset() {
    setTab('import');
    setForm({
      name: '',
      company: '',
      phone: '',
      email: '',
      preferredMethod: 'call',
      sphere: defaultSphere(section),
    });
    setImportPreview([]);
    setImportProgress(0);
    setImportFileName('');
    setError('');
    setDragOver(false);
    setShowPhoneImportHelp(false);
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

  function applyParsedRows(rows: ParsedContactRow[], sourceLabel?: string) {
    if (rows.length === 0) {
      setError('No contacts found. Check the file format or download our sample CSV.');
      return;
    }
    setError('');
    setImportPreview(rows.map((row) => toCreateInput(row, section)));
    if (sourceLabel) setImportFileName(sourceLabel);
    setTab('import');
  }

  function openPhoneVcfImport() {
    setError('');
    setShowPhoneImportHelp(true);
    vcfRef.current?.click();
  }

  async function handleDeviceImport() {
    if (phoneImportMode === 'vcf') {
      openPhoneVcfImport();
      return;
    }

    setError('');
    setShowPhoneImportHelp(false);
    setLoading(true);
    try {
      const picked = await pickDeviceContacts();
      if (picked.length === 0) return;
      applyParsedRows(picked, 'Phone contacts');
    } catch (err) {
      const message = (err as Error).message;
      if (message === 'VCFFALLBACK') {
        openPhoneVcfImport();
        return;
      }
      setError(message);
      setShowPhoneImportHelp(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileImport(file: File) {
    setError('');
    setLoading(true);
    try {
      const text = await file.text();
      const parsed = parseContactFile(file, text);
      applyParsedRows(parsed, file.name);
    } catch (err) {
      setError((err as Error).message || 'Could not read that file.');
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileImport(file);
  }

  async function importAll() {
    if (importPreview.length === 0) return;
    setError('');
    setLoading(true);
    setImportProgress(0);

    const batchSize = 100;
    let imported = 0;
    let skipped = 0;

    try {
      for (let i = 0; i < importPreview.length; i += batchSize) {
        const batch = importPreview.slice(i, i + batchSize);
        const result = await importContacts(batch);
        imported += result.imported;
        skipped += result.skipped;
        setImportProgress(Math.round(((i + batch.length) / importPreview.length) * 100));
      }

      notifyContactsChanged();
      onAdded?.();
      handleClose();

      const msg =
        skipped > 0
          ? `Imported ${imported} contact${imported === 1 ? '' : 's'}. ${skipped} skipped (missing name).`
          : `Imported ${imported} contact${imported === 1 ? '' : 's'}.`;
      showToast(msg);
    } catch (err) {
      setError((err as Error).message || 'Import failed. Try again or add contacts manually.');
    } finally {
      setLoading(false);
      setImportProgress(0);
    }
  }

  const previewCount = importPreview.length;
  const withPhone = importPreview.filter((c) => c.phone).length;
  const withEmail = importPreview.filter((c) => c.email).length;

  return (
    <div className="modal-backdrop" onClick={handleClose} role="presentation">
      <div
        className="add-contact-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="add-contact-title"
      >
        <div className="add-contact-modal__header">
          <h2 id="add-contact-title">Add contacts</h2>
          <button type="button" onClick={handleClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="add-contact-modal__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'import' ? 'true' : 'false'}
            className={tab === 'import' ? 'add-contact-modal__tab--active' : ''}
            onClick={() => setTab('import')}
          >
            <Upload size={15} />
            Import
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'manual' ? 'true' : 'false'}
            className={tab === 'manual' ? 'add-contact-modal__tab--active' : ''}
            onClick={() => setTab('manual')}
          >
            <UserPlus size={15} />
            Add one
          </button>
        </div>

        {error ? <div className="add-contact-modal__error add-contact-modal__error--banner">{error}</div> : null}

        {tab === 'import' ? (
          <div className="add-contact-modal__import">
            {previewCount > 0 ? (
              <div className="add-contact-modal__preview">
                <div className="add-contact-modal__preview-header">
                  <FileSpreadsheet size={20} />
                  <div>
                    <p>
                      <strong>{previewCount}</strong> contact{previewCount > 1 ? 's' : ''} ready
                      {importFileName ? ` · ${importFileName}` : ''}
                    </p>
                    <p className="add-contact-modal__preview-meta">
                      {withPhone} with phone · {withEmail} with email
                    </p>
                  </div>
                </div>
                <ul>
                  {importPreview.slice(0, 6).map((c, i) => (
                    <li key={i}>
                      <strong>{c.name}</strong>
                      {c.phone || c.email ? (
                        <span>{c.phone || c.email}</span>
                      ) : (
                        <span className="add-contact-modal__preview-warn">No phone or email</span>
                      )}
                    </li>
                  ))}
                  {previewCount > 6 ? <li className="add-contact-modal__preview-more">…and {previewCount - 6} more</li> : null}
                </ul>

                {loading && importProgress > 0 ? (
                  <div className="add-contact-modal__progress">
                    <div
                      className="add-contact-modal__progress-bar"
                      style={{ '--progress': `${importProgress}%` } as React.CSSProperties}
                    />
                    <span>Importing… {importProgress}%</span>
                  </div>
                ) : null}

                <button
                  type="button"
                  className="add-contact-modal__submit"
                  onClick={importAll}
                  disabled={loading}
                >
                  {loading ? 'Importing…' : `Import ${previewCount} contact${previewCount > 1 ? 's' : ''}`}
                </button>
                <button
                  type="button"
                  className="add-contact-modal__link"
                  onClick={() => {
                    setImportPreview([]);
                    setImportFileName('');
                  }}
                  disabled={loading}
                >
                  Choose a different file
                </button>
              </div>
            ) : (
              <>
                <div
                  className={`add-contact-modal__dropzone${dragOver ? ' add-contact-modal__dropzone--active' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click();
                  }}
                >
                  <Upload size={28} />
                  <p>
                    <strong>Drop a file here</strong> or tap to browse
                  </p>
                  <p className="add-contact-modal__dropzone-hint">
                    Works with .csv, .vcf (iPhone/Android export), or Google Contacts export
                  </p>
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept=".vcf,.vcard,.csv,text/vcard,text/csv"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileImport(f);
                    e.target.value = '';
                  }}
                />

                <input
                  ref={vcfRef}
                  type="file"
                  accept=".vcf,.vcard,text/vcard"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileImport(f);
                    e.target.value = '';
                  }}
                />

                <div className="add-contact-modal__import-actions">
                  <button type="button" onClick={handleDeviceImport} disabled={loading}>
                    <Smartphone size={16} />
                    {phoneImportMode === 'vcf' ? 'Import from phone (.vcf)' : 'Pick from phone contacts'}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadContactTemplate();
                    }}
                    disabled={loading}
                  >
                    <Download size={16} />
                    Download sample CSV
                  </button>
                </div>

                {showPhoneImportHelp || phoneImportMode === 'vcf' ? (
                  <div className="add-contact-modal__phone-help">
                    <strong>On iPhone</strong>
                    <ol>
                      <li>Open the <strong>Contacts</strong> app</li>
                      <li>Tap and hold a contact (or a group), then <strong>Share</strong></li>
                      <li>Choose <strong>Export vCard</strong> or save to Files</li>
                      <li>Come back here and tap <strong>Import from phone (.vcf)</strong> to select that file</li>
                    </ol>
                    <strong>On Android</strong>
                    <ol>
                      <li>Open <strong>Contacts</strong> → <strong>Fix &amp; manage</strong> → <strong>Export to file</strong></li>
                      <li>Save the .vcf file, then select it here</li>
                    </ol>
                  </div>
                ) : null}

                <p className="add-contact-modal__import-tip">
                  Tip: Export from Google Contacts or Outlook as CSV, or share a .vcf from your phone.
                </p>
              </>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="add-contact-modal__form">
            <label>
              Name *
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                autoFocus
              />
            </label>
            <label>
              Company
              <input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Optional"
              />
            </label>
            <label>
              Phone
              <input
                value={form.phone ?? ''}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                inputMode="tel"
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
