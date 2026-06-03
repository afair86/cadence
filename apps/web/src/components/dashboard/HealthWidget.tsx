import type { RelationshipHealthBreakdown } from '@cadence/shared';
import './health-widget.scss';

interface Props {
  data: RelationshipHealthBreakdown;
}

export default function HealthWidget({ data }: Props) {
  const total = data.healthy;
  const segments = [
    { label: 'Healthy', value: data.healthy, color: '#22c55e' },
    { label: 'Cooling', value: data.cooling, color: '#f59e0b' },
    { label: 'At Risk', value: data.atRisk, color: '#ef4444' },
  ];

  let offset = 0;
  const gradient = segments
    .map((s) => {
      const start = offset;
      offset += s.value;
      return `${s.color} ${start}% ${offset}%`;
    })
    .join(', ');

  return (
    <section className="widget health-widget">
      <h3>Relationship Health</h3>
      <div className="health-widget__chart">
        <div className="health-widget__donut" style={{ background: `conic-gradient(${gradient})` }}>
          <div className="health-widget__donut-hole">
            <strong>{total}%</strong>
            <span>Healthy</span>
          </div>
        </div>
        <ul className="health-widget__legend">
          {segments.map((s) => (
            <li key={s.label}>
              <span style={{ background: s.color }} />
              {s.label} — {s.value}%
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
