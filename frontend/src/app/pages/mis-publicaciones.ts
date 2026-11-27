import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { AvisoService } from '../core/aviso.service';
import { Publicacion, Solicitud } from '../core/models';

@Component({
  selector: 'app-mis-publicaciones',
  imports: [FormsModule],
  template: `
    <h1>Mis publicaciones</h1>

    @if (editando(); as e) {
      <form class="tarjeta" #f="ngForm" (ngSubmit)="guardar(f.valid === true)" novalidate>
        <h2>Editar publicación</h2>
        <label for="t">Título</label><input id="t" name="t" [(ngModel)]="e.titulo" required />
        <label for="d">Descripción</label><textarea id="d" name="d" rows="3" [(ngModel)]="e.descripcion" required></textarea>
        <label for="c">Categoría</label><input id="c" name="c" [(ngModel)]="e.categoria" required />
        <label for="m">Modalidad</label>
        <select id="m" name="m" [(ngModel)]="e.modalidad"><option value="DONACION">Donación</option><option value="INTERCAMBIO">Intercambio</option></select>
        @if (errorForm()) { <p class="error-campo">{{ errorForm() }}</p> }
        <div class="acciones">
          <button type="submit">Guardar</button>
          <button type="button" class="sec" style="color:var(--verde)" (click)="editando.set(null)">Cancelar</button>
        </div>
      </form>
    }

    @if (publicaciones().length === 0) {
      <p class="vacio">Aún no has publicado artículos. Ve al Catálogo para crear el primero.</p>
    }
    @for (p of publicaciones(); track p.id) {
      <article class="tarjeta">
        <div class="fila">
          <div><strong>{{ p.titulo }}</strong> <span class="muted">· {{ p.categoria }} · {{ p.modalidad }}</span></div>
          <span class="badge" [class]="'badge ' + p.estado">{{ p.estado }}</span>
        </div>
        <p>{{ p.descripcion }}</p>
        @if (p.estado === 'DISPONIBLE') {
          <div class="acciones">
            <button class="sec" style="color:var(--verde)" (click)="editar(p)">Editar</button>
            <button class="peligro" (click)="cancelar(p)">Cancelar publicación</button>
          </div>
        }
        <h2 style="margin-top:1rem">Solicitudes recibidas</h2>
        @if (de(p.id).length === 0) { <p class="muted">Sin solicitudes.</p> }
        @for (s of de(p.id); track s.id) {
          <div class="fila" style="border-top:1px solid var(--borde); padding:.5rem 0">
            <div><strong>{{ s.solicitante }}</strong>: {{ s.mensaje }}</div>
            <div class="acciones" style="margin:0">
              <span class="badge" [class]="'badge ' + s.estado">{{ s.estado }}</span>
              @if (s.estado === 'PENDIENTE' && p.estado === 'DISPONIBLE') {
                <button (click)="aceptar(s)">Aceptar</button>
                <button class="peligro" (click)="rechazar(s)">Rechazar</button>
              }
            </div>
          </div>
        }
      </article>
    }
  `,
})
export class MisPublicaciones implements OnInit {
  private api = inject(ApiService);
  private aviso = inject(AvisoService);
  publicaciones = signal<Publicacion[]>([]);
  solicitudes = signal<Solicitud[]>([]);
  editando = signal<Publicacion | null>(null);
  errorForm = signal('');

  ngOnInit() { this.cargar(); }

  de(pubId: number) { return this.solicitudes().filter(s => s.publicacion_id === pubId); }

  cargar() {
    this.api.publicaciones({ mias: true }).subscribe({ next: p => this.publicaciones.set(p), error: e => this.aviso.error(e) });
    this.api.solicitudesRecibidas().subscribe({ next: s => this.solicitudes.set(s), error: e => this.aviso.error(e) });
  }

  editar(p: Publicacion) { this.errorForm.set(''); this.editando.set({ ...p }); }

  guardar(valido: boolean) {
    const e = this.editando()!;
    if (!valido || !e.titulo.trim() || !e.descripcion.trim() || !e.categoria.trim()) {
      this.errorForm.set('Todos los campos son obligatorios.'); return;
    }
    this.api.editarPublicacion(e.id, e).subscribe({
      next: () => { this.aviso.ok('Publicación actualizada'); this.editando.set(null); this.cargar(); },
      error: err => this.aviso.error(err),
    });
  }

  cancelar(p: Publicacion) {
    if (!confirm(`¿Cancelar la publicación «${p.titulo}»? Las solicitudes pendientes serán rechazadas.`)) return;
    this.api.cancelarPublicacion(p.id).subscribe({
      next: () => { this.aviso.ok('Publicación cancelada'); this.cargar(); },
      error: e => { this.aviso.error(e); this.cargar(); },
    });
  }

  aceptar(s: Solicitud) {
    if (!confirm(`¿Aceptar la solicitud de ${s.solicitante}? Las demás pendientes se rechazarán.`)) return;
    this.api.aceptar(s.id).subscribe({
      next: () => { this.aviso.ok('Solicitud aceptada. Se generó la entrega pendiente'); this.cargar(); },
      error: e => { this.aviso.error(e); this.cargar(); },
    });
  }

  rechazar(s: Solicitud) {
    this.api.rechazar(s.id).subscribe({
      next: () => { this.aviso.ok('Solicitud rechazada'); this.cargar(); },
      error: e => { this.aviso.error(e); this.cargar(); },
    });
  }
}
