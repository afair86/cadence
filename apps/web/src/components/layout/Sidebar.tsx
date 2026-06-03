import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Activity,
  ListChecks,
  MessageSquare,
  Calendar,
  Handshake,
  BarChart3,
  ClipboardList,
  Zap,
  Settings,
  Infinity,
} from 'lucide-react';
import SectionSwitcher from './SectionSwitcher';
import { useSmartTaskCount } from '../../hooks/useSmartTaskCount';
import { usePendingMessageCount } from '../../hooks/usePendingMessageCount';
import { useCommitmentCount } from '../../hooks/useCommitmentCount';
import './sidebar.scss';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/activities', label: 'Activities', icon: Activity },
  { to: '/smart-tasks', label: 'Smart Tasks', icon: ListChecks, badgeKey: 'tasks' as const },
  { to: '/messages', label: 'Messages', icon: MessageSquare, badgeKey: 'messages' as const },
  { to: '/commitments', label: 'Commitments', icon: ClipboardList, badgeKey: 'commitments' as const },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/deals', label: 'Deals', icon: Handshake },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/automations', label: 'Automations', icon: Zap },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const taskCount = useSmartTaskCount();
  const messageCount = usePendingMessageCount();
  const commitmentCount = useCommitmentCount();

  function badgeFor(key?: 'tasks' | 'messages' | 'commitments') {
    if (key === 'tasks' && taskCount > 0) return taskCount;
    if (key === 'messages' && messageCount > 0) return messageCount;
    if (key === 'commitments' && commitmentCount > 0) return commitmentCount;
    return null;
  }

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <Infinity size={22} strokeWidth={2.5} />
        <span>Cadence</span>
      </div>

      <SectionSwitcher />

      <nav className="sidebar__nav">
        {navItems.map(({ to, label, icon: Icon, badgeKey }) => {
          const badge = badgeFor(badgeKey);
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
              {badge ? <span className="sidebar__badge">{badge}</span> : null}
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar__footer">
        <div className="sidebar__points">
          <div className="sidebar__points-header">
            <span>Monthly Points</span>
            <strong>12.5 / 15</strong>
          </div>
          <div className="sidebar__progress">
            <div className="sidebar__progress-fill" style={{ width: '83%' }} />
          </div>
          <span className="sidebar__points-note">5 days remaining</span>
        </div>
        <span className="sidebar__version">Cadence v0.1.0</span>
      </div>
    </aside>
  );
}
