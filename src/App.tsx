import { useEffect, useState } from 'react';
import './App.css';
import { Dashboard } from './components/Dashboard';
import { Envios } from './components/Envios';
import { Inventario } from './components/Inventario';
import { MensajeriaPage } from './components/Mensajeria';
import { Pedidos } from './components/Pedidos';

type Page = 'dashboard' | 'pedidos' | 'inventario' | 'envios' | 'mensajeria';

interface NavItem {
  id: Page;
  label: string;
  icon: string;
  section: string;
}

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Panel de control', icon: 'PC', section: 'Principal' },
  { id: 'pedidos', label: 'Pedidos', icon: 'PE', section: 'Operaciones' },
  { id: 'inventario', label: 'Inventario', icon: 'IN', section: 'Operaciones' },
  { id: 'envios', label: 'Envios', icon: 'EN', section: 'Operaciones' },
  { id: 'mensajeria', label: 'Mensajeria', icon: 'MS', section: 'Comunicaciones' },
];

const sections = [...new Set(NAV.map((n) => n.section))];

const PAGE_TITLES: Record<Page, { title: string; subtitle: string }> = {
  dashboard: { title: 'Panel de control', subtitle: 'Estado real de microservicios y operacion SmartLogix' },
  pedidos: { title: 'Gestion de Pedidos', subtitle: 'Crear, actualizar, cancelar y consultar pedidos en ms_pedido' },
  inventario: { title: 'Gestion de Inventario', subtitle: 'Catalogo y stock conectado a ms_inventario' },
  envios: { title: 'Gestion de Envios', subtitle: 'CRUD y seguimiento conectado a ms_envio' },
  mensajeria: { title: 'Mensajeria Interna', subtitle: 'Mensajes operativos conectados a ms_notificacion' },
};

function useTime() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);
  return time.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');
  const date = useTime();
  const info = PAGE_TITLES[page];

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-logo">
            <div className="brand-icon">SL</div>
            <span className="brand-name">Smart<span>Logix</span></span>
          </div>
          <p className="brand-tagline">Plataforma logistica para eCommerce</p>
        </div>

        <nav className="sidebar-nav">
          {sections.map((section) => (
            <div key={section} className="nav-section">
              <div className="nav-section-label">{section}</div>
              {NAV.filter((n) => n.section === section).map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${page === item.id ? 'active' : ''}`}
                  onClick={() => setPage(item.id)}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">OP</div>
            <div className="user-info">
              <div className="user-name">Operador Logistico</div>
              <div className="user-role">Administrador</div>
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div className="topbar-left">
            <div className="topbar-title">{info.title}</div>
            <div className="topbar-subtitle">{info.subtitle}</div>
          </div>
          <div className="topbar-right">
            <div className="topbar-time">{date}</div>
          </div>
        </div>

        {page === 'dashboard' && <Dashboard onNavigate={setPage} />}
        {page === 'pedidos' && <Pedidos />}
        {page === 'inventario' && <Inventario />}
        {page === 'envios' && <Envios />}
        {page === 'mensajeria' && <MensajeriaPage />}
      </main>
    </div>
  );
}
