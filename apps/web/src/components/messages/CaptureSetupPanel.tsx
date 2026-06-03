import { useState } from 'react';
import type { CaptureSetup } from '@cadence/shared';
import { testCaptureWebhook } from '../../lib/api';
import { Check, ChevronDown, ChevronUp, Copy, Radio, Smartphone } from 'lucide-react';
import './capture-setup-panel.scss';

interface Props {
  capture: CaptureSetup;
  onTested: () => void;
}

function CopyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="capture-setup__field">
      <div className="capture-setup__field-head">
        <strong>{label}</strong>
        {hint ? <span>{hint}</span> : null}
      </div>
      <div className="capture-setup__copy-row">
        <code>{value}</code>
        <button type="button" onClick={copy}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

export default function CaptureSetupPanel({ capture, onTested }: Props) {
  const [open, setOpen] = useState(true);
  const [iphoneOpen, setIphoneOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState('');

  async function handleTest() {
    setTesting(true);
    setTestError('');
    try {
      await testCaptureWebhook();
      onTested();
    } catch (err) {
      setTestError((err as Error).message);
    } finally {
      setTesting(false);
    }
  }

  const shortcutBody = JSON.stringify(
    {
      body: 'Paste the message text here',
      phone: 'Sender phone or name',
      platform: 'sms',
      from: 'Sender phone or name',
    },
    null,
    2,
  );

  return (
    <section className="capture-setup">
      <button type="button" className="capture-setup__toggle" onClick={() => setOpen((v) => !v)}>
        <Radio size={16} />
        <span>Auto-capture setup</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open ? (
        <div className="capture-setup__body">
          <p className="capture-setup__intro">
            Cadence can <strong>automatically pull messages in</strong> when they arrive — no
            copy/paste. Each source sends to your private link below. Messages match contacts by
            phone number or email on file.
          </p>

          <CopyField
            label="All messages (iPhone Shortcut, Zapier, Android)"
            value={capture.webhookUrl}
            hint="POST JSON"
          />
          <CopyField label="Text / SMS (Twilio)" value={capture.smsWebhookUrl} />
          <CopyField label="Email (Mailgun, SendGrid, Zapier)" value={capture.emailWebhookUrl} />

          <div className="capture-setup__actions">
            <button type="button" className="capture-setup__test" onClick={handleTest} disabled={testing}>
              {testing ? 'Sending test…' : 'Send test message'}
            </button>
            {testError ? <p className="capture-setup__error">{testError}</p> : null}
          </div>

          <div className="capture-setup__guide">
            <button type="button" className="capture-setup__guide-toggle" onClick={() => setIphoneOpen((v) => !v)}>
              <Smartphone size={14} />
              iPhone — auto-capture texts &amp; iMessage
              {iphoneOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {iphoneOpen ? (
              <ol className="capture-setup__steps">
                <li>Open the <strong>Shortcuts</strong> app → <strong>Automation</strong> → <strong>+</strong></li>
                <li>Choose <strong>Message</strong> → &quot;When I receive a message&quot; → pick contacts or Any</li>
                <li>Add action <strong>Get Contents of URL</strong></li>
                <li>Method: <strong>POST</strong>, URL: paste your link above</li>
                <li>Request body: JSON with the message text and sender (see template below)</li>
                <li>Turn off &quot;Ask Before Running&quot; so it happens automatically</li>
              </ol>
            ) : null}
            {iphoneOpen ? (
              <pre className="capture-setup__json">{shortcutBody}</pre>
            ) : null}
          </div>

          <p className="capture-setup__note">
            Instagram, Facebook &amp; LinkedIn DMs cannot be read directly by any app — use the
            iPhone Shortcut above when a notification arrives, or keep using &quot;Log incoming&quot;
            below. For business SMS, point Twilio at the SMS link.
          </p>
        </div>
      ) : null}
    </section>
  );
}
