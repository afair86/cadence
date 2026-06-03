import { useCallback, useEffect, useState } from 'react';
import type { DashboardData, SmartPlanItem } from '@cadence/shared';
import { Sparkles, Zap } from 'lucide-react';
import { fetchDashboard } from '../lib/api';
import { useContactActions } from '../context/ContactActionContext';
import { useSection } from '../context/SectionContext';
import SmartPlan from '../components/dashboard/SmartPlan';
import './smart-tasks-page.scss';

export default function SmartTasksPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const { runContactAction, contactsVersion } = useContactActions();
  const { section, sectionLabel } = useSection();

  const load = useCallback(() => {
    fetchDashboard(section)
      .then(setData)
      .catch(() => setError('Could not load tasks. Is the API running?'));
  }, [section]);

  useEffect(() => {
    load();
  }, [load, contactsVersion, section]);

  async function handleAction(item: SmartPlanItem) {
    setActingId(item.id);
    const ok = await runContactAction(item.contactId, item.suggestedAction);
    setActingId(null);
    if (ok) load();
  }

  if (error) {
    return <div className="smart-tasks-page smart-tasks-page--error">{error}</div>;
  }

  if (!data) {
    return <div className="smart-tasks-page smart-tasks-page--loading">Loading your tasks…</div>;
  }

  const highCount = data.smartPlan.filter((t) => t.priority === 'high').length;

  return (
    <div className="smart-tasks-page">
      <header className="smart-tasks-page__header">
        <div>
          <h1>{sectionLabel} tasks</h1>
          <p>Who to reach out to today, in priority order</p>
        </div>
        <span className="smart-tasks-page__count">{data.smartPlan.length} tasks</span>
      </header>

      <div
        className={`smart-tasks-page__mode${data.aiEnabled ? ' smart-tasks-page__mode--ai' : ''}`}
      >
        {data.aiEnabled ? (
          <>
            <Sparkles size={16} />
            <span>AI-powered suggestions (OpenAI connected)</span>
          </>
        ) : (
          <>
            <Zap size={16} />
            <span>
              Working on smart rules — no API key needed. Add <code>OPENAI_API_KEY</code> to{' '}
              <code>apps/api/.env</code> for richer AI suggestions.
            </span>
          </>
        )}
      </div>

      {data.weeklyInsights.summary.headline ? (
        <p className="smart-tasks-page__summary">{data.weeklyInsights.summary.headline}</p>
      ) : null}

      {data.smartPlan.length === 0 ? (
        <div className="smart-tasks-page__empty card">
          <h2>No tasks right now</h2>
          <p>Add contacts in this section and Cadence will suggest who to reach out to.</p>
        </div>
      ) : (
        <>
          {highCount > 0 ? (
            <p className="smart-tasks-page__urgent">
              {highCount} high-priority {highCount === 1 ? 'task needs' : 'tasks need'} attention
            </p>
          ) : null}
          <SmartPlan
            items={data.smartPlan}
            estimatedMinutes={data.estimatedMinutes}
            weeklyTime={data.weeklyTime}
            focus={data.smartPlanFocus}
            onAction={handleAction}
            actingId={actingId}
          />
        </>
      )}
    </div>
  );
}
