import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Entrega, Publicacion, Solicitud, Usuario } from './models';
import { environment } from './environment';

type Msg = { mensaje: string };

// Todas las llamadas HTTP a la API Express (flujo: componente -> ApiService -> HttpClient -> API)
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private url = environment.apiUrl;

  // Publicaciones
  publicaciones(filtros: { estado?: string; mias?: boolean } = {}) {
    let params = new HttpParams();
    if (filtros.estado) params = params.set('estado', filtros.estado);
    if (filtros.mias) params = params.set('mias', '1');
    return this.http.get<Publicacion[]>(`${this.url}/publicaciones`, { params });
  }
  crearPublicacion(p: Partial<Publicacion>) { return this.http.post<{ id: number }>(`${this.url}/publicaciones`, p); }
  editarPublicacion(id: number, p: Partial<Publicacion>) { return this.http.put<Msg>(`${this.url}/publicaciones/${id}`, p); }
  cancelarPublicacion(id: number) { return this.http.delete<Msg>(`${this.url}/publicaciones/${id}`); }

  // Solicitudes
  solicitudesMias() { return this.http.get<Solicitud[]>(`${this.url}/solicitudes/mias`); }
  solicitudesRecibidas() { return this.http.get<Solicitud[]>(`${this.url}/solicitudes/recibidas`); }
  solicitudesTodas() { return this.http.get<Solicitud[]>(`${this.url}/solicitudes`); }
  crearSolicitud(publicacion_id: number, mensaje: string) {
    return this.http.post<{ id: number }>(`${this.url}/solicitudes`, { publicacion_id, mensaje });
  }
  aceptar(id: number) { return this.http.put<Msg>(`${this.url}/solicitudes/${id}/aceptar`, {}); }
  rechazar(id: number) { return this.http.put<Msg>(`${this.url}/solicitudes/${id}/rechazar`, {}); }
  cancelarSolicitud(id: number) { return this.http.put<Msg>(`${this.url}/solicitudes/${id}/cancelar`, {}); }

  // Entregas
  entregas() { return this.http.get<Entrega[]>(`${this.url}/entregas`); }
  completarEntrega(id: number) { return this.http.put<Msg>(`${this.url}/entregas/${id}/completar`, {}); }

  // Usuarios (ADMIN)
  usuarios() { return this.http.get<Usuario[]>(`${this.url}/usuarios`); }
  desactivarUsuario(id: number) { return this.http.delete<Msg>(`${this.url}/usuarios/${id}`); }
}
