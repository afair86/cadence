import type { KpiCard as KpiCardType } from '@cadence/shared';
import { Phone, Mail, Coffee, MessageSquare, Star } from 'lucide-react';
import './kpi-cards.scss';

const icons = {
  phone: Phone,
  mail: Mail,
  meeting: Coffee,
  message: MessageSquare,
  points: Star,
};

interface Props {
  items: KpiCardType[];
}

export default function KpiCards({ items }: Props) {
  return (
    <div className="kpi-cards">
      {items.map((kpi) => {
        const Icon = icons[kpi.icon];
        return (
          <article key={kpi.id} className="kpi-card">
            <div className="kpi-card__icon" style={{ background: `${kpi.accent}18`, color: kpi.accent }}>
              <Icon size={18} />
            </div>
            <div className="kpi-card__body">
              <span className="kpi-card__label">{kpi.label}</span>
              <div className="kpi-card__value-row">
                <strong>{kpi.value}</strong>
                {kpi.progress != null ? (
                  <svg className="kpi-card__ring" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                    <circle
                      cx="18"
                      cy="18"
                      r="15"
                      fill="none"
                      stroke={kpi.accent}
                      strokeWidth="3"
                      strokeDasharray={`${kpi.progress} 100`}
                      strokeLinecap="round"
                      transform="rotate(-90 18 18)"
                    />
                  </svg>
                ) : null}
              </div>
              <span className="kpi-card__delta">{kpi.delta}</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
