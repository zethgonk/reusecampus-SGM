import { Component, OnInit, inject, signal } from '@angular/core';
import { ApiService } from '../core/api.service';
import { AvisoService } from '../core/aviso.service';
import { Solicitud, Usuario } from '../core/models';

@Component({
  selector: 'app-admin',
  template: `
    <h1>Administración</h1>
    <h2>Usuarios</h2>
    <table>
      <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
      <tbody>
        @for (u of usuarios(); track u.id) {
          <tr>
            <td>{{ u.nombre }}</td><td>{{ u.correo }}</td><td>{{ u.rol }}</td>
            <td><span class="badge" [class]="'badge ' + u.estado">{{ u.estado }}</span></td>
            <td>@if (u.estado === 'ACTIVO' && u.rol !== 'ADMIN') { <button class="peligro" (click)="desactivar(u)">Desactivar</button> }</td>
          </tr>
        }
      </tbody>
    </table>
    <h2 style="margin-top:1.5rem">Todas las solicitudes</h2>
    <table>
      <thead><tr><th>Artículo</th><th>Propietario</th><th>Solicitante</th><th>Estado</th></tr></thead>
      <tbody>
        @for (s of solicitudes(); track s.id) {
          <tr><td>{{ s.publicacion_titulo }}</td><td>{{ s.propietario }}</td><td>{{ s.solicitante }}</td>
              <td><span class="badge" [class]="'badge ' + s.estado">{{ s.estado }}</span></td></tr>
        }
      </tbody>
    </table>
  `,
})
export class Admin implements OnInit {
  private api = inject(ApiService);
  private aviso = inject(AvisoService);
  usuarios = signal<Usuario[]>([]);
  solicitudes = signal<Solicitud[]>([]);

  ngOnInit() { this.cargar(); }
  cargar() {
    this.api.usuarios().subscribe({ next: u => this.usuarios.set(u), error: e => this.aviso.error(e) });
    this.api.solicitudesTodas().subscribe({ next: s => this.solicitudes.set(s), error: e => this.aviso.error(e) });
  }
  desactivar(u: Usuario) {
    if (!confirm(`¿Desactivar a ${u.nombre}?`)) return;
    this.api.desactivarUsuario(u.id).subscribe({
      next: () => { this.aviso.ok('Usuario desactivado'); this.cargar(); },
      error: e => this.aviso.error(e),
    });
  }
}
