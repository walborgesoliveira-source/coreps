import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const nav = [
  { to: '/',            label: 'Dashboard' },
  { to: '/entidades',   label: 'Entidades' },
  { to: '/equipamentos', label: 'Equipamentos' },
  { to: '/historico',   label: 'Atendimentos' },
  { to: '/servicos',    label: 'Servicos' },
  { to: '/agendamentos', label: 'Agendamentos' },
];

export default function Layout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() { logout(); navigate('/login'); }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{ width: 220, background: '#1e3a8a', color: '#fff', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px 20px 16px', fontWeight: 700, fontSize: 20, letterSpacing: 1 }}>CORE PS</div>
        <nav style={{ flex: 1, padding: '8px 0' }}>
          {nav.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              style={({ isActive }) => ({
                display: 'block', padding: '10px 20px', fontSize: 14, fontWeight: 500,
                color: isActive ? '#fff' : '#93c5fd',
                background: isActive ? 'rgba(255,255,255,.12)' : 'transparent',
                borderLeft: isActive ? '3px solid #60a5fa' : '3px solid transparent',
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,.1)', fontSize: 13 }}>
          <div style={{ marginBottom: 8, color: '#93c5fd' }}>{usuario?.nome}</div>
          <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,.1)', color: '#fff', padding: '6px 14px', borderRadius: 6, fontSize: 13 }}>Sair</button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
