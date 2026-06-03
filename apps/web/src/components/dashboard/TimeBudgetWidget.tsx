import { useState } from 'react';
import type { TimeBudgetSettings, WeeklyTimeBalance, WeeklyTimeInsights } from '@cadence/shared';
import { totalWeeklyHours } from '@cadence/shared';
import { Clock, Pencil, Check, X } from 'lucide-react';
import { updateTimeBudget } from '../../lib/api';
import './time-budget-widget.scss';

interface Props {
  data: WeeklyTimeBalance;
  insights?: WeeklyTimeInsights;
  onUpdated?: () => void;
}

export default function TimeBudgetWidget({ data, insights, onUpdated }: Props) {  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<TimeBudgetSettings>({
    businessHoursPerWeek: 20,
    personalHoursPerWeek: 3,
    familyHoursPerWeek: 2,
  });

  function startEdit() {
    setForm({ ...data.budget });
    setError('');
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      await updateTimeBudget(form);
      setEditing(false);
      onUpdated?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const totalPlanned = totalWeeklyHours(form);

  return (
    <section className="widget time-budget-widget">
      <div className="time-budget-widget__header">
        <h3>
          <Clock size={16} />
          Your week
        </h3>
        {!editing ? (
          <button type="button" className="time-budget-widget__edit" onClick={startEdit}>
            <Pencil size={14} />
            Edit hours
          </button>
        ) : null}
      </div>
      <p className="time-budget-widget__subtitle">
        {data.weekLabel} · {data.totalTargetHours}h planned · day {insights?.daysElapsed ?? '—'} of 7
      </p>

      {insights && !editing ? (
        <>
          <p className="time-budget-widget__summary">{insights.summary.headline}</p>
          {insights.nudges.length > 0 ? (
            <ul className="time-budget-widget__nudges">
              {insights.nudges.map((nudge) => (
                <li
                  key={nudge.id}
                  className={`time-budget-widget__nudge time-budget-widget__nudge--${nudge.severity}`}
                >
                  {nudge.message}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}

      {editing ? (        <div className="time-budget-widget__form">
          <label>
            Business (hours/week)
            <input
              type="number"
              min={0}
              max={168}
              step={0.5}
              value={form.businessHoursPerWeek}
              onChange={(e) =>
                setForm({ ...form, businessHoursPerWeek: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Personal (hours/week)
            <input
              type="number"
              min={0}
              max={168}
              step={0.5}
              value={form.personalHoursPerWeek}
              onChange={(e) =>
                setForm({ ...form, personalHoursPerWeek: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Family (hours/week)
            <input
              type="number"
              min={0}
              max={168}
              step={0.5}
              value={form.familyHoursPerWeek}
              onChange={(e) =>
                setForm({ ...form, familyHoursPerWeek: Number(e.target.value) })
              }
            />
          </label>
          <p className="time-budget-widget__total">Total: {totalPlanned}h / week</p>
          {error ? <p className="time-budget-widget__error">{error}</p> : null}
          <div className="time-budget-widget__form-actions">
            <button type="button" onClick={() => setEditing(false)} disabled={saving}>
              <X size={14} />
              Cancel
            </button>
            <button type="button" className="time-budget-widget__save" onClick={save} disabled={saving}>
              <Check size={14} />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <ul className="time-budget-widget__rows">
          {data.rows.map((row) => (
            <li
              key={row.id}
              className={`time-budget-widget__row${row.highlight ? ' time-budget-widget__row--highlight' : ''}`}
            >
              <div className="time-budget-widget__row-top">
                <span className="time-budget-widget__label">{row.label}</span>
                <span className="time-budget-widget__hours">
                  {row.spentHours}h / {row.targetHours}h
                  {row.remainingHours > 0 ? (
                    <em> · {row.remainingHours}h left</em>
                  ) : (
                    <em className="time-budget-widget__done"> · on track</em>
                  )}
                </span>
              </div>
              <div className="time-budget-widget__bar">
                <span
                  className="time-budget-widget__fill"
                  style={{
                    width: `${row.progressPercent}%`,
                    background: row.accent,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
