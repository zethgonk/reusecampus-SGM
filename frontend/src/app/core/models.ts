export type Rol = 'USUARIO' | 'ADMIN';

export interface Usuario { id: number; nombre: string; correo: string; rol: Rol; estado?: string; }

export interface Publicacion {
  id: number; titulo: string; descripcion: string; categoria: string;
  modalidad: 'DONACION' | 'INTERCAMBIO';
  estado: 'DISPONIBLE' | 'RESERVADA' | 'ENTREGADA' | 'CANCELADA';
  fecha_publicacion: string; usuario_id: number; propietario: string;
}

export interface Solicitud {
  id: number; publicacion_id: number; solicitante_id: number; mensaje: string;
  fecha_solicitud: string; estado: 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'CANCELADA';
  publicacion_titulo: string; publicacion_estado: string; propietario_id: number;
  propietario: string; solicitante: string;
}

export interface Entrega {
  id: number; publicacion_id: number; solicitud_id: number; propietario_id: number; receptor_id: number;
  fecha_acuerdo: string; fecha_entrega: string | null; estado: 'PENDIENTE' | 'COMPLETADA';
  publicacion_titulo: string; propietario: string; receptor: string;
}
