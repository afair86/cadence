import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileTabBar from './MobileTabBar';
import './app-layout.scss';

export default function AppLayout() {
  const location = useLocation();
  const showHeader = location.pathname !== '/contacts';

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-layout__main">
        {showHeader && <Header />}
        <main className="app-layout__content">
          <Outlet />
        </main>
      </div>
      <MobileTabBar />
    </div>
  );
}
