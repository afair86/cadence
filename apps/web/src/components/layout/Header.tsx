import { Bell, Plus, Search, LogOut } from 'lucide-react';
import { SECTIONS } from '@cadence/shared';
import { useAuth } from '../../context/AuthContext';
import { useContactActions } from '../../context/ContactActionContext';
import { useSection } from '../../context/SectionContext';
import './header.scss';

export default function Header() {
  const { user, logout } = useAuth();
  const { openAddContact } = useContactActions();
  const { section, setSection, sectionLabel, sectionSubtitle } = useSection();
  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="header">
      <div className="header__greeting">
        <h1>
          {sectionLabel} <span aria-hidden>👋</span>
        </h1>
        <p>{sectionSubtitle}</p>
        <div className="header__section-tabs">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`header__section-tab${section === s.id ? ' header__section-tab--active' : ''}`}
              onClick={() => setSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="header__search">
        <Search size={16} />
        <input type="search" placeholder="Search contacts..." aria-label="Search contacts" />
        <kbd>⌘K</kbd>
      </div>

      <div className="header__actions">
        <button type="button" className="header__date">
          Today
        </button>
        <button type="button" className="header__add" onClick={openAddContact}>
          <Plus size={16} />
          Add Contact
        </button>
        <button type="button" className="header__bell" aria-label="Notifications">
          <Bell size={18} />
        </button>
        <div className="header__user">
          <div className="header__avatar">{initials}</div>
          <div>
            <strong>{user?.name}</strong>
            <span>{user?.role}</span>
          </div>
        </div>
        <button type="button" className="header__logout" onClick={logout} aria-label="Sign out">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
