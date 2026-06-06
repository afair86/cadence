import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  Users,
  ListChecks,
  MessageSquare,
  Calendar,
  Menu,
  X,
  Activity,
  ClipboardList,
  Settings,
} from 'lucide-react';
import { useSmartTaskCount } from '../../hooks/useSmartTaskCount';
import { usePendingMessageCount } from '../../hooks/usePendingMessageCount';
import { useCommitmentCount } from '../../hooks/useCommitmentCount';
import './mobile-tab-bar.scss';

const tabs = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/smart-tasks', label: 'Tasks', icon: ListChecks },
  { to: '/messages', label: 'Messages', icon: MessageSquare },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
];

const moreLinks = [
  { to: '/activities', label: 'Activities', icon: Activity },
  { to: '/commitments', label: 'Commitments', icon: ClipboardList, badgeKey: 'commitments' as const },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function MobileTabBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const taskCount = useSmartTaskCount();
  const messageCount = usePendingMessageCount();
  const commitmentCount = useCommitmentCount();

  function badgeFor(tab: string) {
    if (tab === '/smart-tasks' && taskCount > 0) return taskCount;
    if (tab === '/messages' && messageCount > 0) return messageCount;
    return null;
  }

  function moreBadge(key?: 'commitments') {
    if (key === 'commitments' && commitmentCount > 0) return commitmentCount;
    return null;
  }

  function goTo(path: string) {
    setMenuOpen(false);
    navigate(path);
  }

  return (
    <>
      {menuOpen ? (
        <div
          className="mobile-tab-bar__backdrop"
          role="presentation"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      {menuOpen ? (
        <div className="mobile-tab-bar__menu" role="dialog" aria-label="More navigation">
          <div className="mobile-tab-bar__menu-header">
            <strong>More</strong>
            <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
              <X size={20} />
            </button>
          </div>
          <div className="mobile-tab-bar__menu-links">
            {moreLinks.map(({ to, label, icon: Icon, badgeKey }) => {
              const badge = moreBadge(badgeKey);
              return (
                <button key={to} type="button" className="mobile-tab-bar__menu-link" onClick={() => goTo(to)}>
                  <Icon size={18} />
                  <span>{label}</span>
                  {badge ? <span className="mobile-tab-bar__badge mobile-tab-bar__badge--menu">{badge}</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <nav className="mobile-tab-bar" aria-label="Main navigation">
        {tabs.map(({ to, label, icon: Icon }) => {
          const badge = badgeFor(to);
          return (
            <NavLink key={to} to={to} className="mobile-tab-bar__link">
              <span className="mobile-tab-bar__icon-wrap">
                <Icon size={20} />
                {badge ? <span className="mobile-tab-bar__badge">{badge}</span> : null}
              </span>
              <span>{label}</span>
            </NavLink>
          );
        })}
        <button
          type="button"
          className={`mobile-tab-bar__link mobile-tab-bar__more${menuOpen ? ' mobile-tab-bar__more--active' : ''}`}
          aria-expanded={menuOpen}
          aria-label="More pages"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="mobile-tab-bar__icon-wrap">
            <Menu size={20} />
            {commitmentCount > 0 ? <span className="mobile-tab-bar__badge">{commitmentCount}</span> : null}
          </span>
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
