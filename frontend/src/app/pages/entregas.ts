import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { AvisoService } from '../core/aviso.service';
import { Entrega } from '../core/models';

@Component({
  selector: 'app-entregas',
  imports: [DatePipe],
  template: `
    <h1>Entregas e intercambios</h1>
    @if (entregas().length === 0) { <p class="vacio">Aún no hay entregas.</p> }
    @for (e of entregas(); track e.id) {
      <article class="tarjeta fila">
        <div>
          <strong>{{ e.publicacion_titulo }}</strong><br />
          <span>{{ e.propietario }} → {{ e.receptor }}</span><br />
          <span class="muted">Acuerdo: {{ e.fecha_acuerdo | date: 'dd/MM/yyyy HH:mm' }}
            @if (e.fecha_entrega) { · Entrega: {{ e.fecha_entrega | date: 'dd/MM/yyyy HH:mm' }} }</span>
        </div>
        <div class="acciones">
          <span class="badge" [class]="'badge ' + e.estado">{{ e.estado }}</span>
          @if (e.estado === 'PENDIENTE' && e.propietario_id === auth.usuario()?.id) {
            <button (click)="completar(e)">Confirmar entrega</button>
          }
        </div>
      </article>
    }
  `,
})
export class Entregas implements OnInit {
  private api = inject(ApiService);
  private aviso = inject(AvisoService);
  auth = inject(AuthService);
  entregas = signal<Entrega[]>([]);

  ngOnInit() { this.cargar(); }
  cargar() { this.api.entregas().subscribe({ next: e => this.entregas.set(e), error: err => this.aviso.error(err) }); }

  completar(e: Entrega) {
    if (!confirm('¿Confirmas que el artículo fue entregado?')) return;
    this.api.completarEntrega(e.id).subscribe({
      next: () => { this.aviso.ok('Entrega completada'); this.cargar(); },
      error: err => { this.aviso.error(err); this.cargar(); },
    });
  }
}
