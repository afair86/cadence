import type { Opportunity } from '@cadence/shared';
import './opportunities-widget.scss';

interface Props {
  items: Opportunity[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function OpportunitiesWidget({ items }: Props) {
  return (
    <section className="widget opportunities-widget">
      <h3>Top Opportunities</h3>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <div>
              <strong>{item.company}</strong>
              <span>{item.stage}</span>
            </div>
            <strong>{formatCurrency(item.value)}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
