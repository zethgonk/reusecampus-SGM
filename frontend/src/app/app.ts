import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { AvisoService } from './core/aviso.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <header class="barra">
      <a class="logo" routerLink="/">♻ ReUse Campus</a>
      @if (auth.logueado()) {
        <nav>
          <a routerLink="/publicaciones" routerLinkActive="activo">Catálogo</a>
          <a routerLink="/mis-publicaciones" routerLinkActive="activo">Mis publicaciones</a>
          <a routerLink="/mis-solicitudes" routerLinkActive="activo">Mis solicitudes</a>
          <a routerLink="/entregas" routerLinkActive="activo">Entregas</a>
          @if (auth.esAdmin()) { <a routerLink="/admin" routerLinkActive="activo">Administración</a> }
        </nav>
        <div class="sesion">
          <span>{{ auth.usuario()?.nombre }} <small class="badge">{{ auth.usuario()?.rol }}</small></span>
          <button class="sec" (click)="auth.logout()">Salir</button>
        </div>
      }
    </header>
    @if (aviso.mensaje(); as m) {
      <div class="aviso" [class.error]="m.tipo === 'error'" role="alert">
        {{ m.texto }} <button class="x" (click)="aviso.cerrar()" aria-label="Cerrar">×</button>
      </div>
    }
    <main><router-outlet /></main>
  `,
})
export class App {
  auth = inject(AuthService);
  aviso = inject(AvisoService);
}
