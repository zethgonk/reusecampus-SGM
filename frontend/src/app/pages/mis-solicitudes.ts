import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiService } from '../core/api.service';
import { AvisoService } from '../core/aviso.service';
import { Solicitud } from '../core/models';

@Component({
  selector: 'app-mis-solicitudes',
  imports: [DatePipe],
  template: `
    <h1>Mis solicitudes</h1>
    @if (solicitudes().length === 0) { <p class="vacio">No has realizado solicitudes.</p> }
    @for (s of solicitudes(); track s.id) {
      <article class="tarjeta fila">
        <div>
          <strong>{{ s.publicacion_titulo }}</strong> <span class="muted">de {{ s.propietario }}</span><br />
          <span>{{ s.mensaje }}</span><br />
          <span class="muted">{{ s.fecha_solicitud | date: 'dd/MM/yyyy HH:mm' }}</span>
        </div>
        <div class="acciones">
          <span class="badge" [class]="'badge ' + s.estado">{{ s.estado }}</span>
          @if (s.estado === 'PENDIENTE') { <button class="peligro" (click)="cancelar(s)">Cancelar</button> }
        </div>
      </article>
    }
  `,
})
export class MisSolicitudes implements OnInit {
  private api = inject(ApiService);
  private aviso = inject(AvisoService);
  solicitudes = signal<Solicitud[]>([]);

  ngOnInit() { this.cargar(); }
  cargar() { this.api.solicitudesMias().subscribe({ next: s => this.solicitudes.set(s), error: e => this.aviso.error(e) }); }

  cancelar(s: Solicitud) {
    if (!confirm('¿Cancelar esta solicitud?')) return;
    this.api.cancelarSolicitud(s.id).subscribe({
      next: () => { this.aviso.ok('Solicitud cancelada'); this.cargar(); },
      error: e => { this.aviso.error(e); this.cargar(); },
    });
  }
}
