import type { SmartPlanItem, SmartPlanFocus, WeeklyTimeBalance } from '@cadence/shared';
import { Clock, Sparkles, Target } from 'lucide-react';
import './smart-plan.scss';

const priorityColors = {
  high: '#22c55e',
  medium: '#f59e0b',
  low: '#3b82f6',
};

interface Props {
  items: SmartPlanItem[];
  estimatedMinutes: number;
  weeklyTime?: WeeklyTimeBalance;
  focus?: SmartPlanFocus | null;
  onAction: (item: SmartPlanItem) => void;
  actingId?: string | null;
}

export default function SmartPlan({
  items,
  estimatedMinutes,
  weeklyTime,
  focus,
  onAction,
  actingId,
}: Props) {
  const focusRow = weeklyTime?.rows.find((r) => r.highlight);
  const remainingLabel =
    focusRow && focusRow.remainingHours > 0
      ? `${focusRow.remainingHours}h left this week for ${focusRow.label.toLowerCase()}`
      : weeklyTime
        ? `${weeklyTime.totalRemainingHours}h left across all sections this week`
        : null;

  return (
    <section className="smart-plan card">
      <div className="smart-plan__header">
        <div>
          <h2>Today&apos;s Smart Plan</h2>
          {focus ? (
            <p className="smart-plan__focus">
              <Target size={14} />
              Focus: {focus.label} — {focus.reason.toLowerCase()}
            </p>
          ) : null}
          <p className="smart-plan__ai">
            <Sparkles size={14} />
            AI suggested optimal times
          </p>
          {remainingLabel ? <p className="smart-plan__budget">{remainingLabel}</p> : null}
        </div>
        <span className="smart-plan__time">
          <Clock size={14} />
          ~{estimatedMinutes} min total
        </span>
      </div>

      <ul className="smart-plan__list">
        {items.map((item) => (
          <li
            key={item.id}
            className="smart-plan__item"
            style={{ borderLeftColor: priorityColors[item.priority] }}
          >
            <div className="smart-plan__contact">
              <strong>{item.contactName}</strong>
              <span>{item.company}</span>
            </div>
            <p className="smart-plan__insight">{item.insight}</p>
            <div className="smart-plan__footer">
              <span className="smart-plan__schedule">{item.scheduledTime}</span>
              <button
                type="button"
                className="smart-plan__action"
                onClick={() => onAction(item)}
                disabled={actingId === item.id}
              >
                {actingId === item.id ? '…' : item.actionLabel}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
