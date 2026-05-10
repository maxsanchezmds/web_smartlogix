export type PedidoEstado = 'creado' | 'aprobado' | 'rechazado' | 'cancelado' | 'finalizado';

export interface PedidoProducto {
  id_producto: string;
  cantidad: number;
}

export interface Pedido {
  id_pedido: string;
  productos: PedidoProducto[];
  direccion_despacho: string;
  estado: PedidoEstado;
  fecha_hora: string;
}

export interface TrazabilidadPedido {
  nombre_solicitante: string;
  tipo_cargo: string;
  empresa: string;
}

export interface PedidoConTrazabilidad extends Pedido {
  trazabilidad_pedido: TrazabilidadPedido;
}

export interface PedidoStatus {
  id_pedido: string;
  estado: PedidoEstado;
}

export type EstadoEnvio = 'pendiente' | 'en_transito' | 'entregado' | 'cancelado';

export interface Envio {
  id: string;
  pedidoId: string;
  direccionDestino: string;
  ciudadDestino: string;
  estado: EstadoEnvio;
  transportista?: string;
  codigoSeguimiento?: string;
  creadoEn: string;
  actualizadoEn: string;
}

export type NotificacionTipo = 'envio_aprobado' | 'envio_rechazado' | 'envio_atrasado' | 'pedido_finalizado';
export type NotificacionStatus = 'entregado' | 'sin entregar' | 'esperando revision';

export interface Notificacion {
  id_notificacion: string;
  id_pedido: string | null;
  tipo_notificacion: NotificacionTipo;
  fecha: string;
  mensaje: string;
  status: NotificacionStatus;
}

export interface Mensajeria {
  id_mensaje: string;
  asunto: string;
  cuerpo: string;
  responsable: string;
  fecha_envio: string;
  destinatarios: string[];
}

export interface ProductoStock {
  cantidad_disponible: number;
  cantidad_reservada: number;
}

export interface Producto {
  id_producto: string;
  nombre: string;
  tipo: string;
  stock: ProductoStock;
  atributos: Record<string, unknown>;
  activo: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface ServiceHealth {
  status: 'ok' | 'offline' | 'checking';
  name: string;
  port: number;
}
