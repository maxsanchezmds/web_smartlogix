import type {
  Envio,
  Mensajeria,
  Pedido,
  PedidoConTrazabilidad,
  PedidoStatus,
  Producto,
} from './types';

const request = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      const json = JSON.parse(text);
      msg = json.message || JSON.stringify(json);
    } catch {
      // keep plain text response
    }
    throw new Error(msg || `HTTP ${res.status}`);
  }

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json() as Promise<T>;
  return {} as T;
};

export interface CreatePedidoPayload {
  productos: { id_producto: string; cantidad: number }[];
  direccion_despacho: string;
  trazabilidad_pedido: {
    nombre_solicitante: string;
    tipo_cargo: string;
    empresa: string;
  };
}

export const pedidosApi = {
  create: (data: CreatePedidoPayload) =>
    request<PedidoConTrazabilidad>('/api/pedidos', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateDireccion: (idPedido: string, direccion_despacho: string) =>
    request<Pedido>(`/api/pedidos/${idPedido}`, {
      method: 'PATCH',
      body: JSON.stringify({ direccion_despacho }),
    }),

  cancel: (idPedido: string) =>
    request<Pedido>(`/api/pedidos/${idPedido}/cancelar`, { method: 'PATCH' }),

  getStatus: (idPedido: string) =>
    request<PedidoStatus>(`/api/pedidos/${idPedido}/estado`),
};

export interface CreateEnvioPayload {
  pedidoId: string;
  direccionDestino: string;
  ciudadDestino: string;
  estado?: string;
  transportista?: string;
  codigoSeguimiento?: string;
}

export const enviosApi = {
  getAll: () => request<Envio[]>('/api/envios'),

  getOne: (id: string) => request<Envio>(`/api/envios/${id}`),

  create: (data: CreateEnvioPayload) =>
    request<Envio>('/api/envios', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<CreateEnvioPayload>) =>
    request<Envio>(`/api/envios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  remove: (id: string) =>
    request<void>(`/api/envios/${id}`, { method: 'DELETE' }),
};

export interface CreateMensajeriaPayload {
  asunto: string;
  cuerpo: string;
  responsable: string;
  fecha_envio: string;
  destinatarios: string[];
}

export const mensajeriaApi = {
  create: (data: CreateMensajeriaPayload) =>
    request<Mensajeria>('/api/notificaciones/mensajeria', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getOne: (id: string) =>
    request<Mensajeria>(`/api/notificaciones/mensajeria/${id}`),

  update: (id: string, data: Partial<CreateMensajeriaPayload>) =>
    request<Mensajeria>(`/api/notificaciones/mensajeria/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  remove: (id: string) =>
    request<Mensajeria>(`/api/notificaciones/mensajeria/${id}`, {
      method: 'DELETE',
    }),
};

export interface CreateProductoPayload {
  id_producto?: string;
  nombre: string;
  tipo: string;
  stock: {
    cantidad_disponible: number;
    cantidad_reservada: number;
  };
  atributos: Record<string, unknown>;
  nombre_responsable: string;
}

export type UpdateProductoPayload = Partial<Omit<CreateProductoPayload, 'id_producto'>> & {
  nombre_responsable: string;
  activo?: boolean;
};

export const inventarioApi = {
  getAll: () => request<Producto[]>('/api/inventario'),

  create: (data: CreateProductoPayload) =>
    request<Producto>('/api/inventario', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (idProducto: string, data: UpdateProductoPayload) =>
    request<Producto>(`/api/inventario/${encodeURIComponent(idProducto)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  remove: (idProducto: string, nombreResponsable: string) =>
    request<Producto>(`/api/inventario/${encodeURIComponent(idProducto)}`, {
      method: 'DELETE',
      body: JSON.stringify({ nombre_responsable: nombreResponsable }),
    }),
};

export const healthApi = {
  pedidos: () => request<{ status: string }>('/health/pedidos'),
  inventario: () => request<{ status: string }>('/health/inventario'),
  envios: () => request<{ status: string }>('/health/envios'),
  notificaciones: () => request<{ status: string }>('/health/notificaciones'),
};
