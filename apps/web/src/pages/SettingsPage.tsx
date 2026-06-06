import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { CaptureSetup, SyncChannel } from '@cadence/shared';
import { fetchSyncSetup, testSyncChannel } from '../lib/api';
import { Check, Copy, Mail, MessageSquare, Phone, RefreshCw, Smartphone } from 'lucide-react';
import './settings-page.scss';

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="sync-channel__copy">
      <span>{label}</span>
      <div className="sync-channel__copy-row">
        <code>{value}</code>
        <button type="button" onClick={copy}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}

interface ChannelCardProps {
  icon: ReactNode;
  title: string;
  summary: string;
  webhookLabel: string;
  webhookUrl: string;
  steps: string[];
  jsonExample: string;
  channel: SyncChannel;
  onTest: (channel: SyncChannel) => void;
  testing: SyncChannel | null;
  testResult?: string;
}

function ChannelCard({
  icon,
  title,
  summary,
  webhookLabel,
  webhookUrl,
  steps,
  jsonExample,
  channel,
  onTest,
  testing,
  testResult,
}: ChannelCardProps) {
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <article className="sync-channel">
      <div className="sync-channel__head">
        <div className="sync-channel__icon">{icon}</div>
        <div>
          <h2>{title}</h2>
          <p>{summary}</p>
        </div>
      </div>

      <CopyField label={webhookLabel} value={webhookUrl} />

      <button type="button" className="sync-channel__guide-toggle" onClick={() => setGuideOpen((v) => !v)}>
        <Smartphone size={14} />
        {guideOpen ? 'Hide setup steps' : 'Show setup steps'}
      </button>

      {guideOpen ? (
        <>
          <ol className="sync-channel__steps">
            {steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <pre className="sync-channel__json">{jsonExample}</pre>
        </>
      ) : null}

      <div className="sync-channel__actions">
        <button
          type="button"
          className="sync-channel__test"
          onClick={() => onTest(channel)}
          disabled={testing === channel}
        >
          {testing === channel ? 'Sending test…' : 'Send test'}
        </button>
        {testResult ? <p className="sync-channel__result">{testResult}</p> : null}
      </div>
    </article>
  );
}

export default function SettingsPage() {
  const [capture, setCapture] = useState<CaptureSetup | null>(null);
  const [error, setError] = useState('');
  const [testing, setTesting] = useState<SyncChannel | null>(null);
  const [testResults, setTestResults] = useState<Partial<Record<SyncChannel, string>>>({});

  useEffect(() => {
    fetchSyncSetup()
      .then(setCapture)
      .catch(() => setError('Could not load sync links. Try signing in again.'));
  }, []);

  async function handleTest(channel: SyncChannel) {
    setTesting(channel);
    setTestResults((prev) => ({ ...prev, [channel]: undefined }));
    try {
      await testSyncChannel(channel);
      const labels: Record<SyncChannel, string> = {
        message: 'Test text saved — check Messages → Incoming.',
        email: 'Test email saved — check Messages → Incoming.',
        call: 'Test call logged — check Activities.',
      };
      setTestResults((prev) => ({ ...prev, [channel]: labels[channel] }));
    } catch (err) {
      setTestResults((prev) => ({ ...prev, [channel]: (err as Error).message }));
    } finally {
      setTesting(null);
    }
  }

  if (error) {
    return <div className="settings-page settings-page--error">{error}</div>;
  }

  if (!capture) {
    return <div className="settings-page settings-page--loading">Loading sync settings…</div>;
  }

  return (
    <div className="settings-page">
      <header className="settings-page__header">
        <h1>Sync calls, texts &amp; email</h1>
        <p>
          Connect your phone and inbox so Cadence automatically logs conversations — no copy/paste.
          Messages match contacts by phone number or email.
        </p>
      </header>

      <section className="settings-page__built-in">
        <RefreshCw size={18} />
        <div>
          <strong>Already works inside Cadence</strong>
          <p>
            When you tap Call, Text, or Email on a contact, we log it automatically and update their
            relationship score.
          </p>
        </div>
      </section>

      <div className="settings-page__channels">
        <ChannelCard
          icon={<MessageSquare size={22} />}
          title="Text messages & iMessage"
          summary="Incoming texts land in Messages. Works with iPhone Shortcuts, Android automations, or Twilio."
          webhookLabel="Text / SMS webhook"
          webhookUrl={capture.smsWebhookUrl}
          channel="message"
          onTest={handleTest}
          testing={testing}
          testResult={testResults.message}
          steps={[
            'On iPhone, open Shortcuts → Automation → + → Message.',
            'Choose “When I receive a message” and pick Any or specific contacts.',
            'Add “Get Contents of URL” — Method POST, paste your link above.',
            'Set Request Body to JSON (see template below).',
            'Turn off “Ask Before Running” so it runs in the background.',
          ]}
          jsonExample={JSON.stringify(
            {
              body: 'Message text here',
              phone: 'Sender phone number',
              from: 'Sender phone number',
              platform: 'sms',
            },
            null,
            2,
          )}
        />

        <ChannelCard
          icon={<Mail size={22} />}
          title="Email"
          summary="Incoming emails appear in Messages. Easiest path: Zapier or Make.com watching Gmail or Outlook."
          webhookLabel="Email webhook"
          webhookUrl={capture.emailWebhookUrl}
          channel="email"
          onTest={handleTest}
          testing={testing}
          testResult={testResults.email}
          steps={[
            'Create a free Zapier or Make.com account.',
            'Trigger: “New Email” in Gmail or Outlook (or Mailgun inbound if you have a domain).',
            'Action: “Webhooks → POST” using the link above.',
            'Map fields: from → from, subject → subject, body → body.',
            'Turn the automation on — new emails sync within a minute.',
          ]}
          jsonExample={JSON.stringify(
            {
              from: 'client@company.com',
              email: 'client@company.com',
              subject: 'Re: Proposal',
              body: 'Email body text here',
              platform: 'email',
            },
            null,
            2,
          )}
        />

        <ChannelCard
          icon={<Phone size={22} />}
          title="Phone calls"
          summary="Calls log to Activities and refresh contact health. Match by phone number on file."
          webhookLabel="Phone call webhook"
          webhookUrl={capture.callWebhookUrl}
          channel="call"
          onTest={handleTest}
          testing={testing}
          testResult={testResults.call}
          steps={[
            'On iPhone, open Shortcuts → Automation → + → Personal Automation.',
            'Choose “Call” → “When a call ends” (or use a third-party call logging shortcut).',
            'Add “Get Contents of URL” — Method POST, paste your call link above.',
            'Pass the caller’s phone number and optional duration in JSON (see template).',
            'Make sure the contact’s phone is saved in Cadence first.',
          ]}
          jsonExample={JSON.stringify(
            {
              type: 'call',
              phone: 'Caller phone number',
              from: 'Caller phone number',
              durationMin: 5,
              notes: 'Optional call notes',
            },
            null,
            2,
          )}
        />
      </div>

      <section className="settings-page__note">
        <p>
          <strong>Important:</strong> Cadence cannot read Instagram, Facebook, or LinkedIn DMs directly —
          no app can. Use the text shortcut when a notification arrives, or log manually on the{' '}
          <Link to="/messages">Messages</Link> page.
        </p>
        <p>
          For outbound texts or emails sent outside Cadence, add{' '}
          <code>&quot;direction&quot;: &quot;outbound&quot;</code> to your webhook JSON so we log them as
          Activities.
        </p>
      </section>
    </div>
  );
}
