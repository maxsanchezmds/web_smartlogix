import { useCallback, useEffect, useMemo, useState } from 'react';
import { enviosApi, healthApi, inventarioApi } from '../api';
import type { Envio, Producto } from '../types';

type Page = 'dashboard' | 'pedidos' | 'inventario' | 'envios' | 'mensajeria';
type SvcStatus = 'checking' | 'online' | 'offline';

interface Props { onNavigate: (p: Page) => void; }

export function Dashboard({ onNavigate }: Props) {
  const [svcs, setSvcs] = useState<Record<string, SvcStatus>>({
    pedidos: 'checking',
    inventario: 'checking',
    envios: 'checking',
    notificaciones: 'checking',
  });
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);

  const checkHealth = useCallback(async () => {
    setSvcs({ pedidos: 'checking', inventario: 'checking', envios: 'checking', notificaciones: 'checking' });
    const [pedidos, inventario, enviosHealth, notificaciones] = await Promise.all([
      healthApi.pedidos().then(() => 'online' as const).catch(() => 'offline' as const),
      healthApi.inventario().then(() => 'online' as const).catch(() => 'offline' as const),
      healthApi.envios().then(() => 'online' as const).catch(() => 'offline' as const),
      healthApi.notificaciones().then(() => 'online' as const).catch(() => 'offline' as const),
    ]);
    setSvcs({ pedidos, inventario, envios: enviosHealth, notificaciones });
  }, []);

  const loadData = useCallback(async () => {
    const [enviosRes, productosRes] = await Promise.allSettled([
      enviosApi.getAll(),
      inventarioApi.getAll(),
    ]);
    if (enviosRes.status === 'fulfilled') setEnvios(enviosRes.value);
    if (productosRes.status === 'fulfilled') setProductos(productosRes.value);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      checkHealth();
      loadData();
    });
  }, [checkHealth, loadData]);

  const online = Object.values(svcs).filter((s) => s === 'online').length;
  const stats = useMemo(() => {
    const entregados = envios.filter((e) => e.estado === 'entregado').length;
    const enTransito = envios.filter((e) => e.estado === 'en_transito').length;
    const stockBajo = productos.filter((p) => p.activo && p.stock.cantidad_disponible <= 5).length;
    return [
      { label: 'Envios registrados', value: String(envios.length), trend: 'ms_envio', color: 'blue' },
      { label: 'En transito', value: String(enTransito), trend: 'activos', color: 'orange' },
      { label: 'Entregados', value: String(entregados), trend: 'historico', color: 'green' },
      { label: 'Stock bajo', value: String(stockBajo), trend: 'ms_inventario', color: 'purple' },
    ];
  }, [envios, productos]);

  return (
    <div className="page">
      <div className="kpi-grid">
        {stats.map((s) => (
          <div key={s.label} className={`kpi-card ${s.color}`}>
            <div className="kpi-header">
              <div className={`kpi-icon ${s.color}`}>{s.label.slice(0, 2).toUpperCase()}</div>
              <div className="kpi-trend neutral">{s.trend}</div>
            </div>
            <div className="kpi-value">{s.value}</div>
            <div className="kpi-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-3-1">
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Actividad operativa</div>
              <div className="panel-subtitle">Datos disponibles desde endpoints REST reales</div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => { checkHealth(); loadData(); }}>Actualizar</button>
          </div>
          <div className="panel-body">
            <div className="activity-list">
              {envios.slice(0, 5).map((envio, i) => (
                <div key={envio.id} className="activity-item">
                  <div className="activity-dot-col">
                    <div className="activity-dot" style={{ background: envio.estado === 'entregado' ? '#16a34a' : envio.estado === 'cancelado' ? '#dc2626' : '#2563eb' }} />
                    {i < Math.min(envios.length, 5) - 1 && <div className="activity-line" />}
                  </div>
                  <div className="activity-content">
                    <div className="activity-title">Envio {envio.id.slice(0, 8).toUpperCase()} - {envio.estado}</div>
                    <div className="activity-meta">Pedido {envio.pedidoId.slice(0, 8).toUpperCase()} - {envio.ciudadDestino}</div>
                  </div>
                </div>
              ))}
              {envios.length === 0 && (
                <div className="empty" style={{ padding: 32 }}>
                  <div className="empty-title">Sin actividad de envios</div>
                  <div className="empty-desc">Cuando ms_envio tenga registros, apareceran aqui.</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">Microservicios</div>
                <div className="panel-subtitle">{online}/4 en linea</div>
              </div>
              <button className="btn-icon" onClick={checkHealth} title="Verificar">R</button>
            </div>
            <div className="panel-body" style={{ padding: '4px 20px' }}>
              {[
                { key: 'pedidos', name: 'ms_pedido', desc: 'Pedidos' },
                { key: 'inventario', name: 'ms_inventario', desc: 'Stock y catalogo' },
                { key: 'envios', name: 'ms_envio', desc: 'Tracking y despacho' },
                { key: 'notificaciones', name: 'ms_notificacion', desc: 'Mensajeria' },
              ].map((svc) => {
                const st = svcs[svc.key];
                return (
                  <div key={svc.key} className="service-row">
                    <div className="service-row-icon">{svc.name.slice(3, 5).toUpperCase()}</div>
                    <div className="service-row-info">
                      <div className="service-row-name">{svc.name}</div>
                      <div className="service-row-desc">{svc.desc}</div>
                    </div>
                    <div className="service-row-status">
                      <div className={`dot ${st === 'online' ? 'dot-green' : st === 'offline' ? 'dot-red' : 'dot-yellow dot-pulse'}`} />
                      <span style={{ color: st === 'online' ? 'var(--green)' : st === 'offline' ? 'var(--red)' : 'var(--yellow)', fontSize: 11 }}>
                        {st === 'online' ? 'Online' : st === 'offline' ? 'Offline' : '...'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">Acciones rapidas</div>
            </div>
            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => onNavigate('pedidos')}>
                Nuevo pedido
              </button>
              <button className="btn btn-brand" style={{ width: '100%', justifyContent: 'center' }} onClick={() => onNavigate('inventario')}>
                Gestionar inventario
              </button>
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={() => onNavigate('envios')}>
                Registrar envio
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Inventario critico</div>
              <div className="panel-subtitle">Productos activos con 5 unidades o menos</div>
            </div>
          </div>
          <div className="panel-body">
            {productos.filter((p) => p.activo && p.stock.cantidad_disponible <= 5).slice(0, 5).map((p) => (
              <div key={p.id_producto} className="flex-between" style={{ padding: '9px 0', borderBottom: '1px solid var(--border-light)' }}>
                <div>
                  <div className="td-main">{p.nombre}</div>
                  <div className="text-xs text-muted mono">{p.id_producto}</div>
                </div>
                <span style={{ fontSize: 17, fontWeight: 800, color: p.stock.cantidad_disponible === 0 ? 'var(--red)' : 'var(--yellow)' }}>{p.stock.cantidad_disponible}</span>
              </div>
            ))}
            {productos.filter((p) => p.activo && p.stock.cantidad_disponible <= 5).length === 0 && <div className="text-sm text-muted">No hay productos en stock bajo.</div>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">Resumen de envios</div>
              <div className="panel-subtitle">Estado actual del pipeline</div>
            </div>
          </div>
          <div className="panel-body">
            {(['pendiente', 'en_transito', 'entregado', 'cancelado'] as const).map((estado) => (
              <div key={estado} className="flex-between" style={{ padding: '9px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{estado}</span>
                <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--brand)' }}>{envios.filter((e) => e.estado === estado).length}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
