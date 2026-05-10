import { useState, useEffect, useCallback } from 'react';
import { enviosApi, type CreateEnvioPayload } from '../api';
import type { Envio, EstadoEnvio } from '../types';
import { Toast } from './Toast';

interface ToastState { message: string; type: 'success' | 'error' | 'info'; }

const ESTADO_LABEL: Record<EstadoEnvio, string> = {
  pendiente: 'Pendiente', en_transito: 'En tránsito', entregado: 'Entregado', cancelado: 'Cancelado',
};
const ESTADO_CLASS: Record<EstadoEnvio, string> = {
  pendiente: 'badge-pendiente', en_transito: 'badge-en_transito', entregado: 'badge-entregado', cancelado: 'badge-cancelado',
};
const ESTADO_STEP: Record<EstadoEnvio, number> = {
  pendiente: 0, en_transito: 1, entregado: 2, cancelado: -1,
};

const STEPS = ['Preparación', 'Despacho', 'En tránsito', 'Entregado'];

function ShipmentSteps({ estado }: { estado: EstadoEnvio }) {
  const step = ESTADO_STEP[estado];
  if (estado === 'cancelado') {
    return <span className="badge badge-cancelado">Envío cancelado</span>;
  }
  return (
    <div className="steps" style={{ margin: '12px 0 0' }}>
      {STEPS.map((s, i) => {
        const done = i < step + 1;
        const active = i === step;
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div className={`step ${done ? 'done' : ''} ${active ? 'active' : ''}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
              <div className="step-circle">{done && !active ? '✓' : i + 1}</div>
              <div className="step-label">{s}</div>
            </div>
            {i < STEPS.length - 1 && (
              <div className="step-line" style={{ background: i < step ? 'var(--green)' : 'var(--border)', height: 2, flex: 1, marginBottom: 20 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const emptyForm = (): CreateEnvioPayload => ({
  pedidoId: '', direccionDestino: '', ciudadDestino: '', estado: 'pendiente', transportista: '', codigoSeguimiento: '',
});

export function Envios() {
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<Envio | null>(null);
  const [showDetail, setShowDetail] = useState<Envio | null>(null);
  const [form, setForm] = useState<CreateEnvioPayload>(emptyForm());
  const [editForm, setEditForm] = useState<Partial<CreateEnvioPayload>>({});
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<EstadoEnvio | 'todos'>('todos');
  const [search, setSearch] = useState('');

  const notify = (message: string, type: ToastState['type'] = 'success') => setToast({ message, type });

  const load = useCallback(async () => {
    setLoading(true);
    try { setEnvios(await enviosApi.getAll()); }
    catch { notify('Error al cargar envíos', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      load();
    });
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await enviosApi.create(form);
      setEnvios(prev => [created, ...prev]);
      setShowCreate(false);
      setForm(emptyForm());
      notify('Envío registrado exitosamente');
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Error al crear envío', 'error');
    } finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    if (!showEdit) return;
    setSaving(true);
    try {
      const updated = await enviosApi.update(showEdit.id, editForm);
      setEnvios(prev => prev.map(e => e.id === updated.id ? updated : e));
      if (showDetail?.id === updated.id) setShowDetail(updated);
      setShowEdit(null);
      notify('Envío actualizado');
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Error al actualizar', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este envío? Esta acción es irreversible.')) return;
    try {
      await enviosApi.remove(id);
      setEnvios(prev => prev.filter(e => e.id !== id));
      if (showDetail?.id === id) setShowDetail(null);
      notify('Envío eliminado');
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Error al eliminar', 'error');
    }
  };

  const filtered = envios.filter(e => {
    const matchF = filter === 'todos' || e.estado === filter;
    const q = search.toLowerCase();
    const matchS = !q || e.ciudadDestino.toLowerCase().includes(q)
      || e.pedidoId.includes(q)
      || (e.transportista || '').toLowerCase().includes(q)
      || (e.codigoSeguimiento || '').toLowerCase().includes(q);
    return matchF && matchS;
  });

  const counts: Record<string, number> = { todos: envios.length };
  envios.forEach(e => { counts[e.estado] = (counts[e.estado] || 0) + 1; });

  return (
    <div className="page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* KPIs */}
      <div className="kpi-grid mb-20" style={{ marginBottom: 20 }}>
        {([
          { label: 'Pendientes', val: counts['pendiente'] || 0, icon: '🕐', color: 'orange' },
          { label: 'En tránsito', val: counts['en_transito'] || 0, icon: '🚚', color: 'blue' },
          { label: 'Entregados', val: counts['entregado'] || 0, icon: '✅', color: 'green' },
          { label: 'Total registros', val: envios.length, icon: '📦', color: 'purple' },
        ] as const).map(k => (
          <div key={k.label} className={`kpi-card ${k.color}`}>
            <div className="kpi-header">
              <div className={`kpi-icon ${k.color}`}>{k.icon}</div>
            </div>
            <div className="kpi-value">{loading ? '—' : k.val}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex-between mb-16">
        <div className="flex-center gap-8" style={{ flexWrap: 'wrap' }}>
          {(['todos', 'pendiente', 'en_transito', 'entregado', 'cancelado'] as const).map(f => (
            <button key={f} className={`btn btn-sm ${filter === f ? 'btn-brand' : 'btn-ghost'}`} onClick={() => setFilter(f)}>
              {f === 'todos' ? 'Todos' : ESTADO_LABEL[f as EstadoEnvio]}
              <span style={{ background: filter === f ? 'rgba(255,255,255,0.25)' : 'var(--bg)', padding: '0 5px', borderRadius: 100, fontSize: 11, fontWeight: 700 }}>
                {counts[f] || 0}
              </span>
            </button>
          ))}
        </div>
        <div className="flex-center gap-10">
          <div className="search-wrap">
            <span className="search-icon">🔎</span>
            <input className="form-control search-input" placeholder="Ciudad, transportista, código..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn-icon" onClick={load} title="Actualizar">🔄</button>
          <button className="btn btn-primary" onClick={() => { setShowCreate(true); setForm(emptyForm()); }}>+ Nuevo envío</button>
        </div>
      </div>

      {/* Table */}
      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">Registro de envíos</div>
            <div className="panel-subtitle">{filtered.length} registros{filter !== 'todos' ? ` · ${ESTADO_LABEL[filter as EstadoEnvio]}` : ''}</div>
          </div>
        </div>
        {loading ? (
          <div className="loading"><div className="spinner" />Cargando envíos...</div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🚛</div>
            <div className="empty-title">Sin envíos</div>
            <div className="empty-desc">
              {envios.length === 0 ? 'Registra el primer envío con "+ Nuevo envío".' : 'No hay envíos con ese filtro.'}
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID Envío</th>
                  <th>Pedido</th>
                  <th>Estado</th>
                  <th>Destino</th>
                  <th>Transportista</th>
                  <th>Seguimiento</th>
                  <th>Registrado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id}>
                    <td>
                      <button className="btn btn-ghost btn-xs mono" onClick={() => setShowDetail(e)}>
                        {e.id.slice(0, 8).toUpperCase()}…
                      </button>
                    </td>
                    <td><span className="mono text-xs text-muted">#{e.pedidoId.slice(0, 8).toUpperCase()}</span></td>
                    <td><span className={`badge ${ESTADO_CLASS[e.estado]}`}>{ESTADO_LABEL[e.estado]}</span></td>
                    <td>
                      <div className="td-main">{e.ciudadDestino}</div>
                      <div className="text-xs text-muted truncate" style={{ maxWidth: 180 }}>{e.direccionDestino}</div>
                    </td>
                    <td>
                      {e.transportista
                        ? <span className="chip">{e.transportista}</span>
                        : <span className="text-xs text-muted">—</span>}
                    </td>
                    <td className="mono text-xs">{e.codigoSeguimiento || <span className="text-muted">—</span>}</td>
                    <td className="text-xs text-muted" style={{ whiteSpace: 'nowrap' }}>
                      {new Date(e.creadoEn).toLocaleDateString('es-CL')}
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="btn-icon" title="Ver detalle" onClick={() => setShowDetail(e)}>👁️</button>
                        <button className="btn-icon" title="Editar" onClick={() => {
                          setShowEdit(e);
                          setEditForm({ direccionDestino: e.direccionDestino, ciudadDestino: e.ciudadDestino, estado: e.estado, transportista: e.transportista || '', codigoSeguimiento: e.codigoSeguimiento || '' });
                        }}>✏️</button>
                        <button className="btn-icon" title="Eliminar" style={{ color: 'var(--red)' }} onClick={() => handleDelete(e.id)}>🗑️</button>
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
                <div className="modal-header-icon">🚚</div>
                <h3>Registrar nuevo envío</h3>
                <p>Asocia el envío a un pedido y define sus datos de despacho</p>
              </div>
              <button className="modal-close" onClick={() => setShowCreate(false)}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-row cols-2">
                  <div className="form-field span-2">
                    <label className="form-label">ID del pedido asociado <span className="req">*</span></label>
                    <input className="form-control" placeholder="UUID del pedido"
                      value={form.pedidoId} onChange={e => setForm(f => ({ ...f, pedidoId: e.target.value }))} required />
                    <span className="form-hint">Ingresa el UUID del pedido al que corresponde este envío</span>
                  </div>
                  <div className="form-field span-2">
                    <label className="form-label">Dirección de destino <span className="req">*</span></label>
                    <input className="form-control" placeholder="Av. Principal 742, Providencia"
                      value={form.direccionDestino} onChange={e => setForm(f => ({ ...f, direccionDestino: e.target.value }))} required />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Ciudad <span className="req">*</span></label>
                    <input className="form-control" placeholder="Santiago"
                      value={form.ciudadDestino} onChange={e => setForm(f => ({ ...f, ciudadDestino: e.target.value }))} required />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Estado inicial</label>
                    <select className="form-control" value={form.estado}
                      onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
                      <option value="pendiente">Pendiente de despacho</option>
                      <option value="en_transito">En tránsito</option>
                      <option value="entregado">Entregado</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="form-label">Transportista</label>
                    <input className="form-control" placeholder="Chilexpress, Starken, etc."
                      value={form.transportista} onChange={e => setForm(f => ({ ...f, transportista: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Código de seguimiento</label>
                    <input className="form-control" placeholder="CHX-001234"
                      value={form.codigoSeguimiento} onChange={e => setForm(f => ({ ...f, codigoSeguimiento: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Registrando...' : '✓ Registrar envío'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowEdit(null)}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <h3>Editar envío</h3>
                <p>Actualiza el estado o datos de despacho</p>
              </div>
              <button className="modal-close" onClick={() => setShowEdit(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-row cols-2">
                <div className="form-field span-2">
                  <label className="form-label">Dirección destino</label>
                  <input className="form-control" value={editForm.direccionDestino || ''}
                    onChange={e => setEditForm(f => ({ ...f, direccionDestino: e.target.value }))} />
                </div>
                <div className="form-field">
                  <label className="form-label">Ciudad</label>
                  <input className="form-control" value={editForm.ciudadDestino || ''}
                    onChange={e => setEditForm(f => ({ ...f, ciudadDestino: e.target.value }))} />
                </div>
                <div className="form-field">
                  <label className="form-label">Estado del envío</label>
                  <select className="form-control" value={editForm.estado || 'pendiente'}
                    onChange={e => setEditForm(f => ({ ...f, estado: e.target.value }))}>
                    <option value="pendiente">Pendiente de despacho</option>
                    <option value="en_transito">En tránsito</option>
                    <option value="entregado">Entregado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Transportista</label>
                  <input className="form-control" value={editForm.transportista || ''}
                    onChange={e => setEditForm(f => ({ ...f, transportista: e.target.value }))} />
                </div>
                <div className="form-field">
                  <label className="form-label">Código seguimiento</label>
                  <input className="form-control" value={editForm.codigoSeguimiento || ''}
                    onChange={e => setEditForm(f => ({ ...f, codigoSeguimiento: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowEdit(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleUpdate} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail / Tracking Modal */}
      {showDetail && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowDetail(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div>
                <div className="modal-header-icon">📍</div>
                <h3>Seguimiento de envío</h3>
                <p>ID: <span className="mono">{showDetail.id}</span></p>
              </div>
              <button className="modal-close" onClick={() => setShowDetail(null)}>×</button>
            </div>
            <div className="modal-body">
              <ShipmentSteps estado={showDetail.estado} />

              <div className="divider" />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { label: 'Pedido asociado', val: `#${showDetail.pedidoId.slice(0, 8).toUpperCase()}` },
                  { label: 'Estado actual', val: <span className={`badge ${ESTADO_CLASS[showDetail.estado]}`}>{ESTADO_LABEL[showDetail.estado]}</span> },
                  { label: 'Destino', val: showDetail.ciudadDestino },
                  { label: 'Dirección', val: showDetail.direccionDestino },
                  { label: 'Transportista', val: showDetail.transportista || '—' },
                  { label: 'Código seguimiento', val: showDetail.codigoSeguimiento || '—' },
                  { label: 'Registrado', val: new Date(showDetail.creadoEn).toLocaleString('es-CL') },
                  { label: 'Última actualización', val: new Date(showDetail.actualizadoEn).toLocaleString('es-CL') },
                ].map(row => (
                  <div key={row.label}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{row.label}</div>
                    <div style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 500 }}>{row.val}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(showDetail.id)}>Eliminar</button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowEdit(showDetail); setEditForm({ direccionDestino: showDetail.direccionDestino, ciudadDestino: showDetail.ciudadDestino, estado: showDetail.estado, transportista: showDetail.transportista || '', codigoSeguimiento: showDetail.codigoSeguimiento || '' }); setShowDetail(null); }}>
                Editar
              </button>
              <button className="btn btn-brand btn-sm" onClick={() => setShowDetail(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
