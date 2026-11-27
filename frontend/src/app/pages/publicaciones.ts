import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { AvisoService } from '../core/aviso.service';
import { Publicacion } from '../core/models';

@Component({
  selector: 'app-publicaciones',
  imports: [FormsModule, DatePipe],
  template: `
    <div class="fila">
      <h1>Catálogo de artículos</h1>
      <div class="acciones">
        <select [ngModel]="filtro()" (ngModelChange)="filtro.set($event); cargar()" aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          <option>DISPONIBLE</option><option>RESERVADA</option><option>ENTREGADA</option><option>CANCELADA</option>
        </select>
        <button (click)="mostrarForm.set(!mostrarForm())">{{ mostrarForm() ? 'Cerrar' : '+ Publicar artículo' }}</button>
      </div>
    </div>

    @if (mostrarForm()) {
      <form class="tarjeta" #f="ngForm" (ngSubmit)="publicar(f.valid === true)" novalidate>
        <h2>Nueva publicación</h2>
        <label for="titulo">Título</label>
        <input id="titulo" name="titulo" [(ngModel)]="nueva.titulo" required maxlength="150" />
        <label for="descripcion">Descripción</label>
        <textarea id="descripcion" name="descripcion" rows="3" [(ngModel)]="nueva.descripcion" required></textarea>
        <label for="categoria">Categoría</label>
        <input id="categoria" name="categoria" [(ngModel)]="nueva.categoria" required maxlength="60" placeholder="Libros, Calculadoras, Componentes…" />
        <label for="modalidad">Modalidad</label>
        <select id="modalidad" name="modalidad" [(ngModel)]="nueva.modalidad" required>
          <option value="DONACION">Donación</option><option value="INTERCAMBIO">Intercambio</option>
        </select>
        @if (errorForm()) { <p class="error-campo">{{ errorForm() }}</p> }
        <div class="acciones"><button type="submit">Publicar</button></div>
      </form>
    }

    @if (solicitando(); as p) {
      <div class="tarjeta">
        <h2>Solicitar «{{ p.titulo }}»</h2>
        <label for="mensaje">Mensaje para el propietario</label>
        <textarea id="mensaje" rows="3" maxlength="500" [(ngModel)]="mensaje" placeholder="¿Por qué te interesa? ¿Cuándo puedes retirarlo?"></textarea>
        @if (errorSol()) { <p class="error-campo">{{ errorSol() }}</p> }
        <div class="acciones">
          <button (click)="enviarSolicitud(p)">Enviar solicitud</button>
          <button class="sec" style="color:var(--verde)" (click)="solicitando.set(null)">Cancelar</button>
        </div>
      </div>
    }

    @if (publicaciones().length === 0) {
      <p class="vacio">No hay publicaciones para mostrar.</p>
    } @else {
      <div class="grid">
        @for (p of publicaciones(); track p.id) {
          <article class="tarjeta">
            <div class="fila"><strong>{{ p.titulo }}</strong><span class="badge" [class]="'badge ' + p.estado">{{ p.estado }}</span></div>
            <span class="muted">{{ p.categoria }} · {{ p.modalidad === 'DONACION' ? 'Donación' : 'Intercambio' }}</span>
            <p>{{ p.descripcion }}</p>
            <span class="muted">Por {{ p.propietario }} · {{ p.fecha_publicacion | date: 'dd/MM/yyyy' }}</span>
            @if (p.usuario_id === auth.usuario()?.id) {
              <span class="muted"><em>Es tu publicación</em></span>
            } @else if (p.estado === 'DISPONIBLE') {
              <div class="acciones"><button (click)="abrirSolicitud(p)">Solicitar</button></div>
            }
          </article>
        }
      </div>
    }
  `,
})
export class Publicaciones implements OnInit {
  private api = inject(ApiService);
  private aviso = inject(AvisoService);
  auth = inject(AuthService);

  publicaciones = signal<Publicacion[]>([]);
  filtro = signal('');
  mostrarForm = signal(false);
  solicitando = signal<Publicacion | null>(null);
  errorForm = signal(''); errorSol = signal('');
  mensaje = '';
  nueva: any = { titulo: '', descripcion: '', categoria: '', modalidad: 'DONACION' };

  ngOnInit() { this.cargar(); }

  cargar() {
    this.api.publicaciones({ estado: this.filtro() || undefined }).subscribe({
      next: p => this.publicaciones.set(p),
      error: e => this.aviso.error(e),
    });
  }

  publicar(valido: boolean) {
    this.errorForm.set('');
    if (!valido || !this.nueva.titulo.trim() || !this.nueva.descripcion.trim() || !this.nueva.categoria.trim()) {
      this.errorForm.set('Todos los campos son obligatorios.');
      return;
    }
    this.api.crearPublicacion(this.nueva).subscribe({
      next: () => {
        this.aviso.ok('Publicación creada');
        this.nueva = { titulo: '', descripcion: '', categoria: '', modalidad: 'DONACION' };
        this.mostrarForm.set(false);
        this.cargar();
      },
      error: e => this.aviso.error(e),
    });
  }

  abrirSolicitud(p: Publicacion) { this.solicitando.set(p); this.mensaje = ''; this.errorSol.set(''); }

  enviarSolicitud(p: Publicacion) {
    if (!this.mensaje.trim()) { this.errorSol.set('Escribe un mensaje para el propietario.'); return; }
    this.api.crearSolicitud(p.id, this.mensaje).subscribe({
      next: () => { this.aviso.ok('Solicitud enviada'); this.solicitando.set(null); this.cargar(); },
      error: e => { this.aviso.error(e); this.cargar(); },   // recarga: el estado pudo cambiar
    });
  }
}
