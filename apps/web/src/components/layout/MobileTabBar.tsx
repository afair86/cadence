import { NavLink } from 'react-router-dom';
import { Home, Users, ListChecks, MessageSquare, Calendar } from 'lucide-react';
import { useSmartTaskCount } from '../../hooks/useSmartTaskCount';
import { usePendingMessageCount } from '../../hooks/usePendingMessageCount';
import './mobile-tab-bar.scss';

const tabs = [
  { to: '/dashboard', label: 'Home', icon: Home },
  { to: '/contacts', label: 'Contacts', icon: Users },
  { to: '/smart-tasks', label: 'Tasks', icon: ListChecks },
  { to: '/messages', label: 'Messages', icon: MessageSquare },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
];

export default function MobileTabBar() {
  const taskCount = useSmartTaskCount();
  const messageCount = usePendingMessageCount();

  return (
    <nav className="mobile-tab-bar" aria-label="Main navigation">
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className="mobile-tab-bar__link">
          <span className="mobile-tab-bar__icon-wrap">
            <Icon size={20} />
            {to === '/smart-tasks' && taskCount > 0 ? (
              <span className="mobile-tab-bar__badge">{taskCount}</span>
            ) : null}
            {to === '/messages' && messageCount > 0 ? (
              <span className="mobile-tab-bar__badge">{messageCount}</span>
            ) : null}
          </span>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
