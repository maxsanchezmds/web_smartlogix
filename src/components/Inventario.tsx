import { useCallback, useEffect, useMemo, useState } from 'react';
import { inventarioApi, type CreateProductoPayload } from '../api';
import type { Producto } from '../types';
import { Toast } from './Toast';

interface ToastState { message: string; type: 'success' | 'error' | 'info'; }

const emptyForm = (): CreateProductoPayload => ({
  id_producto: '',
  nombre: '',
  tipo: '',
  stock: { cantidad_disponible: 0, cantidad_reservada: 0 },
  atributos: {},
  nombre_responsable: '',
});

const stockClass = (p: Producto) => {
  if (!p.activo) return 'badge-cancelado';
  if (p.stock.cantidad_disponible <= 0) return 'badge-rechazado';
  if (p.stock.cantidad_disponible <= 5) return 'badge-pendiente';
  return 'badge-aprobado';
};

const stockLabel = (p: Producto) => {
  if (!p.activo) return 'Inactivo';
  if (p.stock.cantidad_disponible <= 0) return 'Sin stock';
  if (p.stock.cantidad_disponible <= 5) return 'Stock bajo';
  return 'Disponible';
};

export function Inventario() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Producto | null>(null);
  const [form, setForm] = useState<CreateProductoPayload>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'todos' | 'activos' | 'bajo' | 'inactivos'>('todos');

  const notify = (message: string, type: ToastState['type'] = 'success') => setToast({ message, type });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProductos(await inventarioApi.getAll());
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Error al cargar inventario', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      load();
    });
  }, [load]);

  const filtered = useMemo(() => productos.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !q || p.id_producto.toLowerCase().includes(q)
      || p.nombre.toLowerCase().includes(q)
      || p.tipo.toLowerCase().includes(q);
    const matchFilter = filter === 'todos'
      || (filter === 'activos' && p.activo)
      || (filter === 'bajo' && p.activo && p.stock.cantidad_disponible <= 5)
      || (filter === 'inactivos' && !p.activo);
    return matchSearch && matchFilter;
  }), [productos, search, filter]);

  const counts = {
    todos: productos.length,
    activos: productos.filter((p) => p.activo).length,
    bajo: productos.filter((p) => p.activo && p.stock.cantidad_disponible <= 5).length,
    inactivos: productos.filter((p) => !p.activo).length,
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setShowCreate(true);
  };

  const openEdit = (p: Producto) => {
    setEditing(p);
    setForm({
      id_producto: p.id_producto,
      nombre: p.nombre,
      tipo: p.tipo,
      stock: p.stock,
      atributos: p.atributos || {},
      nombre_responsable: '',
    });
    setShowCreate(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        const updated = await inventarioApi.update(editing.id_producto, {
          nombre: form.nombre,
          tipo: form.tipo,
          stock: form.stock,
          atributos: form.atributos,
          nombre_responsable: form.nombre_responsable,
          activo: editing.activo,
        });
        setProductos((prev) => prev.map((p) => p.id_producto === updated.id_producto ? updated : p));
        notify('Producto actualizado');
      } else {
        const payload = { ...form };
        if (!payload.id_producto?.trim()) delete payload.id_producto;
        const created = await inventarioApi.create(payload);
        setProductos((prev) => [created, ...prev]);
        notify('Producto creado');
      }
      setShowCreate(false);
      setEditing(null);
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Error al guardar producto', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActivo = async (p: Producto) => {
    const responsable = prompt('Nombre del responsable');
    if (!responsable) return;
    try {
      const updated = await inventarioApi.update(p.id_producto, {
        activo: !p.activo,
        nombre_responsable: responsable,
      });
      setProductos((prev) => prev.map((row) => row.id_producto === updated.id_producto ? updated : row));
      notify(updated.activo ? 'Producto reactivado' : 'Producto desactivado');
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Error al cambiar estado', 'error');
    }
  };

  const handleDelete = async (p: Producto) => {
    const responsable = prompt('Nombre del responsable');
    if (!responsable) return;
    try {
      const updated = await inventarioApi.remove(p.id_producto, responsable);
      setProductos((prev) => prev.map((row) => row.id_producto === updated.id_producto ? updated : row));
      notify('Producto desactivado');
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : 'Error al desactivar producto', 'error');
    }
  };

  return (
    <div className="page">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="kpi-grid mb-20">
        {([
          { label: 'Productos', val: counts.todos, color: 'blue' },
          { label: 'Activos', val: counts.activos, color: 'green' },
          { label: 'Stock bajo', val: counts.bajo, color: 'orange' },
          { label: 'Inactivos', val: counts.inactivos, color: 'purple' },
        ] as const).map((k) => (
          <div key={k.label} className={`kpi-card ${k.color}`}>
            <div className="kpi-value">{loading ? '-' : k.val}</div>
            <div className="kpi-label">{k.label}</div>
          </div>
        ))}
      </div>

      <div className="flex-between mb-16">
        <div className="flex-center gap-8" style={{ flexWrap: 'wrap' }}>
          {(['todos', 'activos', 'bajo', 'inactivos'] as const).map((f) => (
            <button key={f} className={`btn btn-sm ${filter === f ? 'btn-brand' : 'btn-ghost'}`} onClick={() => setFilter(f)}>
              {f === 'todos' ? 'Todos' : f === 'bajo' ? 'Stock bajo' : f === 'activos' ? 'Activos' : 'Inactivos'}
              <span style={{ background: filter === f ? 'rgba(255,255,255,0.25)' : 'var(--bg)', padding: '0 5px', borderRadius: 100, fontSize: 11, fontWeight: 700 }}>
                {counts[f]}
              </span>
            </button>
          ))}
        </div>
        <div className="flex-center gap-10">
          <div className="search-wrap">
            <span className="search-icon">#</span>
            <input className="form-control search-input" placeholder="SKU, nombre o tipo..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="btn-icon" onClick={load} title="Actualizar">R</button>
          <button className="btn btn-primary" onClick={openCreate}>+ Nuevo producto</button>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">Catalogo de inventario</div>
            <div className="panel-subtitle">{filtered.length} productos conectados a ms_inventario</div>
          </div>
        </div>
        {loading ? (
          <div className="loading"><div className="spinner" />Cargando inventario...</div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">INV</div>
            <div className="empty-title">Sin productos</div>
            <div className="empty-desc">Crea productos para comenzar a gestionar stock real.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Tipo</th>
                  <th>Stock</th>
                  <th>Estado</th>
                  <th>Actualizado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id_producto}>
                    <td>
                      <div className="td-main">{p.nombre}</div>
                      <div className="text-xs text-muted mono">{p.id_producto}</div>
                    </td>
                    <td><span className="chip">{p.tipo}</span></td>
                    <td>
                      <div className="stock-bar">
                        <span className="stock-level">{p.stock.cantidad_disponible}</span>
                        <span className="text-xs text-muted">reservado: {p.stock.cantidad_reservada}</span>
                      </div>
                    </td>
                    <td><span className={`badge ${stockClass(p)}`}>{stockLabel(p)}</span></td>
                    <td className="text-xs text-muted">{new Date(p.fecha_actualizacion).toLocaleString('es-CL')}</td>
                    <td>
                      <div className="row-actions">
                        <button className="btn-icon" title="Editar" onClick={() => openEdit(p)}>E</button>
                        <button className="btn-icon" title={p.activo ? 'Desactivar' : 'Reactivar'} onClick={() => handleToggleActivo(p)}>
                          {p.activo ? 'I' : 'A'}
                        </button>
                        <button className="btn-icon" title="Eliminar" style={{ color: 'var(--red)' }} onClick={() => handleDelete(p)}>X</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="modal">
            <div className="modal-header">
              <div>
                <div className="modal-header-icon">SKU</div>
                <h3>{editing ? 'Editar producto' : 'Nuevo producto'}</h3>
                <p>Datos enviados directamente a ms_inventario</p>
              </div>
              <button className="modal-close" onClick={() => setShowCreate(false)}>x</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row cols-2">
                  <div className="form-field">
                    <label className="form-label">ID producto</label>
                    <input className="form-control" value={form.id_producto || ''} disabled={!!editing}
                      placeholder="SKU-001"
                      onChange={(e) => setForm((f) => ({ ...f, id_producto: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Tipo <span className="req">*</span></label>
                    <input className="form-control" value={form.tipo} required
                      placeholder="Electronica"
                      onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))} />
                  </div>
                  <div className="form-field span-2">
                    <label className="form-label">Nombre <span className="req">*</span></label>
                    <input className="form-control" value={form.nombre} required
                      placeholder="Sensor logistico"
                      onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Disponible <span className="req">*</span></label>
                    <input type="number" min={0} className="form-control" value={form.stock.cantidad_disponible}
                      onChange={(e) => setForm((f) => ({ ...f, stock: { ...f.stock, cantidad_disponible: Number(e.target.value) } }))} required />
                  </div>
                  <div className="form-field">
                    <label className="form-label">Reservado</label>
                    <input type="number" min={0} className="form-control" value={form.stock.cantidad_reservada}
                      onChange={(e) => setForm((f) => ({ ...f, stock: { ...f.stock, cantidad_reservada: Number(e.target.value) } }))} />
                  </div>
                  <div className="form-field span-2">
                    <label className="form-label">Responsable <span className="req">*</span></label>
                    <input className="form-control" value={form.nombre_responsable} required
                      placeholder="Operador logistico"
                      onChange={(e) => setForm((f) => ({ ...f, nombre_responsable: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
