import type { AutomationMessage } from '@cadence/shared';
import { MessageSquare, Pencil } from 'lucide-react';
import './automation-widget.scss';

interface Props {
  automation: AutomationMessage;
  onApprove: () => void;
  onEdit?: (message: string) => void;
}

export default function AutomationWidget({ automation, onApprove, onEdit }: Props) {
  return (
    <section className="widget automation-widget">
      <h3>Upcoming Automated Message</h3>
      <div className="automation-widget__meta">
        <MessageSquare size={14} />
        <span>
          {automation.contactName} · {automation.company}
        </span>
        <time>{automation.scheduledFor}</time>
      </div>
      <blockquote className="automation-widget__message">&ldquo;{automation.message}&rdquo;</blockquote>
      <p className="automation-widget__status">{automation.statusLabel}</p>
      <div className="automation-widget__actions">
        <button
          type="button"
          className="automation-widget__edit"
          onClick={() => {
            const edited = window.prompt('Edit message:', automation.message);
            if (edited?.trim()) onEdit?.(edited.trim());
          }}
        >
          <Pencil size={14} />
          Edit
        </button>
        <button type="button" className="automation-widget__approve" onClick={onApprove}>
          Approve &amp; Send
        </button>
      </div>
    </section>
  );
}
