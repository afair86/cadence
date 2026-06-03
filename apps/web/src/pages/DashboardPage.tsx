import { useCallback, useEffect, useState } from 'react';
import type { DashboardData, SmartPlanItem } from '@cadence/shared';
import { approveAutomation, fetchDashboard } from '../lib/api';
import { useContactActions } from '../context/ContactActionContext';
import { useSection } from '../context/SectionContext';
import type { SectionView } from '@cadence/shared';
import KpiCards from '../components/dashboard/KpiCards';
import SmartPlan from '../components/dashboard/SmartPlan';
import AutomationWidget from '../components/dashboard/AutomationWidget';
import HealthWidget from '../components/dashboard/HealthWidget';
import OpportunitiesWidget from '../components/dashboard/OpportunitiesWidget';
import TimeBudgetWidget from '../components/dashboard/TimeBudgetWidget';
import './dashboard-page.scss';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const { runContactAction, contactsVersion } = useContactActions();
  const { section, setSection } = useSection();

  const load = useCallback(() => {
    fetchDashboard(section)
      .then(setData)
      .catch(() => setError('Could not load dashboard. Is the API running?'));
  }, [section]);

  useEffect(() => {
    load();
  }, [load, contactsVersion, section]);

  async function handleApprove() {
    if (!data?.automation) return;
    await approveAutomation(data.automation.id);
    setApproved(true);
  }

  async function handlePlanAction(item: SmartPlanItem) {
    setActingId(item.id);
    const ok = await runContactAction(item.contactId, item.suggestedAction);
    setActingId(null);
    if (ok) load();
  }

  if (error) {
    return <div className="dashboard-page dashboard-page--error">{error}</div>;
  }

  if (!data) {
    return <div className="dashboard-page dashboard-page--loading">Loading your game plan…</div>;
  }

  return (
    <div className="dashboard-page">
      <TimeBudgetWidget
        data={data.weeklyTime}
        insights={data.weeklyInsights}
        onUpdated={load}
      />

      {data.smartPlanFocus &&
      section !== 'all' &&
      section !== data.smartPlanFocus.sphere ? (
        <div className="dashboard-page__cross-nudge">
          <span>{data.weeklyInsights.summary.headline}</span>
          <button
            type="button"
            onClick={() => setSection(data.smartPlanFocus!.sphere as SectionView)}
          >
            Focus on {data.smartPlanFocus.label}
          </button>
        </div>
      ) : null}

      {section === 'business' ? <KpiCards items={data.kpis} /> : null}

      <div className="dashboard-page__grid">
        <SmartPlan
          items={data.smartPlan}
          estimatedMinutes={data.estimatedMinutes}
          weeklyTime={data.weeklyTime}
          focus={data.smartPlanFocus}
          onAction={handlePlanAction}
          actingId={actingId}
        />

        <aside className="dashboard-page__widgets">
          {data.automation && !approved ? (
            <AutomationWidget automation={data.automation} onApprove={handleApprove} />
          ) : approved ? (
            <section className="widget automation-widget">
              <h3>Message Approved</h3>
              <p className="automation-widget__status" style={{ color: 'var(--success)' }}>
                Your message to John Smith is scheduled.
              </p>
            </section>
          ) : null}
          <HealthWidget data={data.relationshipHealth} />
          <OpportunitiesWidget items={data.opportunities} />
        </aside>
      </div>
    </div>
  );
}
