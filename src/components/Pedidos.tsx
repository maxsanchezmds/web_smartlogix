import { useState } from 'react';
import { pedidosApi, type CreatePedidoPayload } from '../api';
import type { PedidoConTrazabilidad, PedidoEstado, PedidoStatus } from '../types';
import { Toast } from './Toast';

interface ToastState { message: string; type: 'success' | 'error' | 'info'; }

const ESTADO_LABEL: Record<PedidoEstado, string> = {
  creado: 'Pendiente', aprobado: 'Aprobado', rechazado: 'Rechazado',
  cancelado: 'Cancelado', finalizado: 'Finalizado',
};

const ESTADO_CLASS: Record<PedidoEstado, string> = {
  creado: 'badge-creado', aprobado: 'badge-aprobado', rechazado: 'badge-rechazado',
  cancelado: 'badge-cancelado', finalizado: 'badge-finalizado',
};

const emptyForm = (): CreatePedidoPayload => ({
  productos: [{ id_producto: '', cantidad: 1 }],
  direccion_despacho: '',
  trazabilidad_pedido: { nombre_solicitante: '', tipo_cargo: '', empresa: '' },
});

export function Pedidos() {
  const [pedidos, setPedidos] = useState<PedidoConTrazabilidad[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDir, setEditDir] = useState('');
  const [statusId, setStatusId] = useState('');
  const [statusRes, setStatusRes] = useState<PedidoStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [form, setForm] = useState<CreatePedidoPayload>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<PedidoEstado | 'todos'>('todos');
  const [search, setSearch] = useState('');

  const notify = (message: string, type: ToastState['type'] = 'success') => setToast({ message, type });

  const addProducto = () => setForm(f => ({ ...f, productos: [...f.productos, { id_producto: '', cantidad: 1 }] }));
  const removeProducto = (i: number) => setForm(f => ({ ...f, productos: f.productos.filter((_, idx) => idx !== i) }));
  const setProducto = (i: number, field: string, val: string | number) =>
    setForm(f => ({ ...f, productos: f.productos.map((p, idx) => idx === i ? { ...p, [field]: val } : p) }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const p = await pedidosApi.create(form);
      setPedidos(prev => [p, ...prev]);
      setShowCreate(false);
      setForm(emptyForm());
      notify('Pedido creado exitosamente');
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Error al crear pedido', 'error');
    } finally { setSaving(false); }
  };

  const handleUpdateDir = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      const updated = await pedidosApi.updateDireccion(editId, editDir);
      setPedidos(prev => prev.map(p => p.id_pedido === editId ? { ...p, ...updated } : p));
      setEditId(null);
      notify('Dirección actualizada');
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Error al actualizar', 'error');
    } finally { setSaving(false); }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('¿Deseas cancelar este pedido? Esta acción no se puede deshacer.')) return;
    try {
      const updated = await pedidosApi.cancel(id);
      setPedidos(prev => prev.map(p => p.id_pedido === id ? { ...p, ...updated } : p));
      notify('Pedido cancelado');
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Error al cancelar', 'error');
    }
  };

  const handleCheckStatus = async () => {
    if (!statusId.trim()) return;
    setStatusLoading(true);
    setStatusRes(null);
    try {
      setStatusRes(await pedidosApi.getStatus(statusId.trim()));
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Pedido no encontrado', 'error');
    } finally { setStatusLoading(false); }
  };

  const filtered = pedidos.filter(p => {
    const matchFilter = filter === 'todos' || p.estado === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || p.trazabilidad_pedido.empresa.toLowerCase().includes(q)
      || p.trazabilidad_pedido.nombre_solicitante.toLowerCase().includes(q)
      || p.id_pedido.includes(q);
    return matchFilter && matchSearch;
  });

  const counts: Record<string, number> = { todos: pedidos.length };
  pedidos.forEach(p => { counts[p.estado] = (counts[p.estado] || 0) + 1; });

  return (
    <div className="page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Track Order */}
      <div className="panel mb-20">
        <div className="panel-header">
          <div>
            <div className="panel-title">🔍 Consultar estado de pedido</div>
            <div className="panel-subtitle">Ingresa el ID del pedido para ver su estado actual</div>
          </div>
        </div>
        <div className="panel-body">
          <div className="flex-center gap-10">
            <div className="search-wrap" style={{ maxWidth: 400, flex: 1 }}>
              <span className="search-icon">🔎</span>
              <input
                className="form-control search-input"
                placeholder="ID de pedido (UUID)..."
                value={statusId}
                onChange={e => { setStatusId(e.target.value); setStatusRes(null); }}
                onKeyDown={e => e.key === 'Enter' && handleCheckStatus()}
              />
            </div>
            <button className="btn btn-brand" onClick={handleCheckStatus} disabled={statusLoading}>
              {statusLoading ? '⏳ Consultando...' : 'Consultar estado'}
            </button>
          </div>
          {statusRes && (
            <div className="alert alert-info mt-8" style={{ marginBottom: 0 }}>
              <span style={{ fontSize: 18 }}>📋</span>
              <div>
                <strong>Pedido encontrado</strong> · Estado actual:{' '}
                <span className={`badge ${ESTADO_CLASS[statusRes.estado]}`}>{ESTADO_LABEL[statusRes.estado]}</span>
                <div className="text-xs text-muted mt-4">ID: {statusRes.id_pedido}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex-between mb-16">
        <div className="flex-center gap-10">
          {/* Filters */}
          <div className="flex-center gap-8" style={{ flexWrap: 'wrap' }}>
            {(['todos', 'creado', 'aprobado', 'rechazado', 'cancelado', 'finalizado'] as const).map(f => (
              <button
                key={f}
                className={`btn btn-sm ${filter === f ? 'btn-brand' : 'btn-ghost'}`}
                onClick={() => setFilter(f)}
              >
                {f === 'todos' ? 'Todos' : ESTADO_LABEL[f]}
                {counts[f] !== undefined && (
                  <span style={{
                    background: filter === f ? 'rgba(255,255,255,0.25)' : 'var(--bg)',
                    padding: '0 5px',
                    borderRadius: 100,
                    fontSize: 11,
                    fontWeight: 700,
                  }}>{counts[f] || 0}</span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-center gap-10">
          <div className="search-wrap">
            <span className="search-icon">🔎</span>
            <input className="form-control search-input" placeholder="Buscar empresa, solicitante..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={() => { setShowCreate(true); setForm(emptyForm()); }}>
            + Nuevo pedido
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">Pedidos registrados</div>
            <div className="panel-subtitle">{filtered.length} pedidos{filter !== 'todos' ? ` · filtrado por ${ESTADO_LABEL[filter as PedidoEstado]}` : ''}</div>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📭</div>
            <div className="empty-title">Sin pedidos</div>
            <div className="empty-desc">
              {pedidos.length === 0
                ? 'Aún no has creado pedidos. Presiona "+ Nuevo pedido" para comenzar.'
                : 'No hay pedidos que coincidan con el filtro aplicado.'}
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Estado</th>
                  <th>Empresa / Solicitante</th>
                  <th>Productos</th>
                  <th>Dirección despacho</th>
                  <th>Fecha</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id_pedido}>
                    <td>
                      <div className="td-main mono">#{p.id_pedido.slice(0, 8).toUpperCase()}</div>
                      <div className="text-xs text-muted">{p.trazabilidad_pedido.tipo_cargo}</div>
                    </td>
                    <td>
                      <span className={`badge ${ESTADO_CLASS[p.estado]}`}>{ESTADO_LABEL[p.estado]}</span>
                    </td>
                    <td>
                      <div className="td-main">{p.trazabilidad_pedido.empresa}</div>
                      <div className="text-xs text-muted">{p.trazabilidad_pedido.nombre_solicitante}</div>
                    </td>
                    <td>
                      <div className="tags-row">
                        {p.productos.map((pr, i) => (
                          <span key={i} className="prod-chip">
                            <strong>{pr.id_producto}</strong> ×{pr.cantidad}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ maxWidth: 200 }}>
                      <span className="truncate" style={{ display: 'block', fontSize: 12.5, color: 'var(--text-2)' }}>
                        {p.direccion_despacho}
                      </span>
                    </td>
                    <td className="text-xs text-muted" style={{ whiteSpace: 'nowrap' }}>
                      {new Date(p.fecha_hora).toLocaleDateString('es-CL')}<br />
                      <span style={{ fontSize: 11 }}>{new Date(p.fecha_hora).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td>
                      <div className="row-actions">
                        {p.estado === 'creado' && (
                          <>
                            <button className="btn-icon" title="Editar dirección"
                              onClick={() => { setEditId(p.id_pedido); setEditDir(p.direccion_despacho); }}>✏️</button>
                            <button className="btn-icon" title="Cancelar pedido"
                              onClick={() => handleCancel(p.id_pedido)}
                              style={{ color: 'var(--red)' }}>✕</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <div className="modal-header-icon">📋</div>
                <h3>Nuevo pedido</h3>
                <p>Completa los datos del pedido y la trazabilidad</p>
              </div>
              <button className="modal-close" onClick={() => setShowCreate(false)}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {/* Dirección */}
                <div className="form-row mb-16" style={{ marginBottom: 16 }}>
                  <div className="form-field">
                    <label className="form-label">Dirección de despacho <span className="req">*</span></label>
                    <input className="form-control" placeholder="Av. Providencia 1234, Santiago"
                      value={form.direccion_despacho}
                      onChange={e => setForm(f => ({ ...f, direccion_despacho: e.target.value }))} required />
                  </div>
                </div>

                {/* Productos */}
                <div style={{ marginBottom: 16 }}>
                  <div className="flex-between mb-16" style={{ marginBottom: 10 }}>
                    <label className="form-label">Productos <span className="req">*</span></label>
                    <button type="button" className="btn btn-ghost btn-xs" onClick={addProducto}>+ Agregar</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {form.productos.map((p, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                        <div className="form-field" style={{ flex: 2 }}>
                          {i === 0 && <label className="form-label" style={{ fontSize: 11 }}>SKU / ID producto</label>}
                          <input className="form-control" placeholder="PROD-001" value={p.id_producto}
                            onChange={e => setProducto(i, 'id_producto', e.target.value)} required />
                        </div>
                        <div className="form-field" style={{ flex: 1 }}>
                          {i === 0 && <label className="form-label" style={{ fontSize: 11 }}>Cantidad</label>}
                          <input type="number" className="form-control" min={1} value={p.cantidad}
                            onChange={e => setProducto(i, 'cantidad', parseInt(e.target.value) || 1)} required />
                        </div>
                        {form.productos.length > 1 && (
                          <button type="button" className="btn-icon" onClick={() => removeProducto(i)}
                            style={{ marginBottom: 0, flexShrink: 0 }}>×</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="divider" />

                {/* Trazabilidad */}
                <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '14px', border: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 12 }}>
                    📍 Información de trazabilidad
                  </div>
                  <div className="form-row cols-2">
                    <div className="form-field">
                      <label className="form-label">Solicitante <span className="req">*</span></label>
                      <input className="form-control" placeholder="Juan Pérez" required
                        value={form.trazabilidad_pedido.nombre_solicitante}
                        onChange={e => setForm(f => ({ ...f, trazabilidad_pedido: { ...f.trazabilidad_pedido, nombre_solicitante: e.target.value } }))} />
                    </div>
                    <div className="form-field">
                      <label className="form-label">Cargo <span className="req">*</span></label>
                      <input className="form-control" placeholder="Jefe de Bodega" required
                        value={form.trazabilidad_pedido.tipo_cargo}
                        onChange={e => setForm(f => ({ ...f, trazabilidad_pedido: { ...f.trazabilidad_pedido, tipo_cargo: e.target.value } }))} />
                    </div>
                    <div className="form-field span-2">
                      <label className="form-label">Empresa <span className="req">*</span></label>
                      <input className="form-control" placeholder="Comercial Ejemplo S.A." required
                        value={form.trazabilidad_pedido.empresa}
                        onChange={e => setForm(f => ({ ...f, trazabilidad_pedido: { ...f.trazabilidad_pedido, empresa: e.target.value } }))} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Creando...' : '✓ Crear pedido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit address */}
      {editId && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setEditId(null)}>
          <div className="modal modal-sm">
            <div className="modal-header">
              <div>
                <h3>Actualizar dirección</h3>
                <p>Modifica la dirección de despacho del pedido</p>
              </div>
              <button className="modal-close" onClick={() => setEditId(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-field">
                <label className="form-label">Nueva dirección</label>
                <input className="form-control" value={editDir} onChange={e => setEditDir(e.target.value)}
                  placeholder="Av. Nueva 456, Providencia, Santiago" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setEditId(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleUpdateDir} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
