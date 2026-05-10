import { useState } from 'react';
import { mensajeriaApi, type CreateMensajeriaPayload } from '../api';
import type { Mensajeria } from '../types';
import { Toast } from './Toast';

interface ToastState { message: string; type: 'success' | 'error' | 'info'; }

const emptyForm = (): CreateMensajeriaPayload => ({
  asunto: '',
  cuerpo: '',
  responsable: '',
  fecha_envio: new Date().toISOString().slice(0, 16),
  destinatarios: [''],
});

export function MensajeriaPage() {
  const [mensajes, setMensajes] = useState<Mensajeria[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<Mensajeria | null>(null);
  const [lookupId, setLookupId] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [form, setForm] = useState<CreateMensajeriaPayload>(emptyForm());
  const [saving, setSaving] = useState(false);

  const notify = (message: string, type: ToastState['type'] = 'success') => setToast({ message, type });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const dests = form.destinatarios.filter(d => d.trim());
    if (!dests.length) { notify('Agrega al menos un destinatario', 'error'); return; }
    setSaving(true);
    try {
      const m = await mensajeriaApi.create({ ...form, fecha_envio: new Date(form.fecha_envio).toISOString(), destinatarios: dests });
      setMensajes(prev => [m, ...prev]);
      setShowCreate(false);
      setForm(emptyForm());
      notify('Mensaje enviado exitosamente');
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Error al enviar mensaje', 'error');
    } finally { setSaving(false); }
  };

  const handleLookup = async () => {
    if (!lookupId.trim()) return;
    setLookupLoading(true);
    try {
      const m = await mensajeriaApi.getOne(lookupId.trim());
      setShowDetail(m);
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Mensaje no encontrado', 'error');
    } finally { setLookupLoading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este mensaje permanentemente?')) return;
    try {
      await mensajeriaApi.remove(id);
      setMensajes(prev => prev.filter(m => m.id_mensaje !== id));
      if (showDetail?.id_mensaje === id) setShowDetail(null);
      notify('Mensaje eliminado');
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Error al eliminar', 'error');
    }
  };

  const addDest = () => setForm(f => ({ ...f, destinatarios: [...f.destinatarios, ''] }));
  const setDest = (i: number, v: string) => setForm(f => ({ ...f, destinatarios: f.destinatarios.map((d, idx) => idx === i ? v : d) }));
  const removeDest = (i: number) => setForm(f => ({ ...f, destinatarios: f.destinatarios.filter((_, idx) => idx !== i) }));

  return (
    <div className="page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header row */}
      <div className="grid-2">
        {/* Lookup panel */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">🔍 Buscar mensaje</div>
              <div className="panel-subtitle">Consulta un mensaje por su identificador único</div>
            </div>
          </div>
          <div className="panel-body">
            <div className="flex-center gap-10">
              <div className="search-wrap" style={{ flex: 1, maxWidth: '100%' }}>
                <span className="search-icon">🔎</span>
                <input className="form-control search-input" placeholder="UUID del mensaje..."
                  value={lookupId} onChange={e => setLookupId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleLookup()} />
              </div>
              <button className="btn btn-brand" onClick={handleLookup} disabled={lookupLoading}>
                {lookupLoading ? '...' : 'Buscar'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats panel */}
        <div className="panel">
          <div className="panel-header">
            <div className="panel-title">📊 Estadísticas de mensajería</div>
          </div>
          <div className="panel-body">
            <div className="mini-stats" style={{ justifyContent: 'space-around' }}>
              <div className="mini-stat">
                <div className="mini-stat-value">{mensajes.length}</div>
                <div className="mini-stat-label">Total enviados</div>
              </div>
              <div style={{ width: 1, background: 'var(--border)' }} />
              <div className="mini-stat">
                <div className="mini-stat-value">
                  {new Set(mensajes.flatMap(m => m.destinatarios)).size}
                </div>
                <div className="mini-stat-label">Destinatarios únicos</div>
              </div>
              <div style={{ width: 1, background: 'var(--border)' }} />
              <div className="mini-stat">
                <div className="mini-stat-value">
                  {mensajes.length > 0
                    ? Math.round(mensajes.reduce((acc, m) => acc + m.destinatarios.length, 0) / mensajes.length * 10) / 10
                    : 0}
                </div>
                <div className="mini-stat-label">Dest. promedio</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex-between mb-16">
        <div>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Mensajes enviados</span>
          <span className="text-muted text-sm" style={{ marginLeft: 8 }}>{mensajes.length} registros</span>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowCreate(true); setForm(emptyForm()); }}>
          + Redactar mensaje
        </button>
      </div>

      {/* Messages list */}
      {mensajes.length === 0 ? (
        <div className="panel">
          <div className="empty">
            <div className="empty-icon">📨</div>
            <div className="empty-title">Bandeja vacía</div>
            <div className="empty-desc">Redacta y envía el primer mensaje con el botón "+ Redactar mensaje".</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mensajes.map(m => (
            <div key={m.id_mensaje} className="panel" style={{ marginBottom: 0 }}>
              <div className="panel-body" style={{ padding: '14px 20px' }}>
                <div className="flex-between">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex-center gap-10 mb-4" style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{m.asunto}</div>
                      <span className="chip">👤 {m.responsable}</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 10, lineHeight: 1.5 }}
                      className="truncate">{m.cuerpo}</div>
                    <div className="flex-center gap-8" style={{ flexWrap: 'wrap' }}>
                      {m.destinatarios.slice(0, 3).map((d, i) => (
                        <span key={i} style={{ fontSize: 12, background: 'var(--brand-light)', color: 'var(--brand)', padding: '2px 9px', borderRadius: 100, fontWeight: 500 }}>{d}</span>
                      ))}
                      {m.destinatarios.length > 3 && (
                        <span className="chip">+{m.destinatarios.length - 3} más</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, marginLeft: 20, flexShrink: 0 }}>
                    <div className="text-xs text-muted">
                      {new Date(m.fecha_envio).toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div className="flex-center gap-8">
                      <button className="btn btn-ghost btn-xs" onClick={() => setShowDetail(m)}>Ver detalle</button>
                      <button className="btn-icon" style={{ color: 'var(--red)', width: 28, height: 28 }} onClick={() => handleDelete(m.id_mensaje)}>🗑️</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Compose Modal */}
      {showCreate && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div>
                <div className="modal-header-icon">✉️</div>
                <h3>Redactar mensaje</h3>
                <p>Comunica información relevante al equipo operativo</p>
              </div>
              <button className="modal-close" onClick={() => setShowCreate(false)}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-row cols-2" style={{ marginBottom: 14 }}>
                  <div className="form-field span-2">
                    <label className="form-label">Asunto <span className="req">*</span></label>
                    <input className="form-control" placeholder="Ej: Alerta de retraso en envíos zona norte"
                      value={form.asunto} onChange={e => setForm(f => ({ ...f, asunto: e.target.value }))} required />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Responsable <span className="req">*</span></label>
                    <input className="form-control" placeholder="Nombre del emisor"
                      value={form.responsable} onChange={e => setForm(f => ({ ...f, responsable: e.target.value }))} required />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Fecha de envío <span className="req">*</span></label>
                    <input type="datetime-local" className="form-control"
                      value={form.fecha_envio} onChange={e => setForm(f => ({ ...f, fecha_envio: e.target.value }))} required />
                  </div>
                  <div className="form-field span-2">
                    <label className="form-label">Cuerpo del mensaje <span className="req">*</span></label>
                    <textarea className="form-control" rows={4}
                      placeholder="Escribe aquí el contenido del mensaje..."
                      value={form.cuerpo} onChange={e => setForm(f => ({ ...f, cuerpo: e.target.value }))} required />
                  </div>
                </div>

                <div style={{ background: 'var(--bg)', border: '1px solid var(--border-light)', borderRadius: 8, padding: 14 }}>
                  <div className="flex-between mb-16" style={{ marginBottom: 10 }}>
                    <label className="form-label">Destinatarios <span className="req">*</span></label>
                    <button type="button" className="btn btn-ghost btn-xs" onClick={addDest}>+ Agregar</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {form.destinatarios.map((d, i) => (
                      <div key={i} className="flex-center gap-8">
                        <input className="form-control" value={d} placeholder="correo@empresa.cl"
                          onChange={e => setDest(i, e.target.value)} style={{ flex: 1 }} />
                        {form.destinatarios.length > 1 && (
                          <button type="button" className="btn-icon" onClick={() => removeDest(i)}>×</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Enviando...' : '📤 Enviar mensaje'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="overlay" onClick={e => e.target === e.currentTarget && setShowDetail(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div>
                <div className="modal-header-icon">📩</div>
                <h3>{showDetail.asunto}</h3>
                <p>Enviado por {showDetail.responsable} · {new Date(showDetail.fecha_envio).toLocaleString('es-CL')}</p>
              </div>
              <button className="modal-close" onClick={() => setShowDetail(null)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'var(--bg)', borderRadius: 8, padding: 16, marginBottom: 16, lineHeight: 1.7, fontSize: 14, color: 'var(--text-2)' }}>
                {showDetail.cuerpo}
              </div>

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
                  Destinatarios ({showDetail.destinatarios.length})
                </div>
                <div className="tags-row">
                  {showDetail.destinatarios.map((d, i) => (
                    <span key={i} style={{ fontSize: 12.5, background: 'var(--brand-light)', color: 'var(--brand)', padding: '4px 12px', borderRadius: 100, fontWeight: 500 }}>{d}</span>
                  ))}
                </div>
              </div>

              <div className="divider" />

              <div style={{ display: 'flex', gap: 24, fontSize: 12.5, color: 'var(--text-3)' }}>
                <div><strong style={{ color: 'var(--text-2)' }}>ID:</strong> <span className="mono">{showDetail.id_mensaje}</span></div>
                <div><strong style={{ color: 'var(--text-2)' }}>Enviado:</strong> {new Date(showDetail.fecha_envio).toLocaleString('es-CL')}</div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(showDetail.id_mensaje)}>🗑️ Eliminar</button>
              <button className="btn btn-ghost" onClick={() => setShowDetail(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
