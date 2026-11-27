import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { AvisoService } from '../core/aviso.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <div class="tarjeta login">
      <h1>{{ modoRegistro() ? 'Crear cuenta' : 'Iniciar sesión' }}</h1>
      <form #f="ngForm" (ngSubmit)="enviar(f.valid === true)" novalidate>
        @if (modoRegistro()) {
          <label for="nombre">Nombre</label>
          <input id="nombre" name="nombre" [(ngModel)]="nombre" required maxlength="100" />
        }
        <label for="correo">Correo</label>
        <input id="correo" name="correo" type="email" [(ngModel)]="correo" required email />
        <label for="password">Contraseña</label>
        <input id="password" name="password" type="password" [(ngModel)]="password" required minlength="6" />
        @if (error()) { <p class="error-campo">{{ error() }}</p> }
        <div class="acciones">
          <button type="submit" [disabled]="cargando()">{{ modoRegistro() ? 'Registrarme' : 'Entrar' }}</button>
          <button type="button" class="sec" style="color:var(--verde)" (click)="cambiarModo()">
            {{ modoRegistro() ? 'Ya tengo cuenta' : 'Crear cuenta' }}
          </button>
        </div>
      </form>
    </div>
  `,
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);
  private aviso = inject(AvisoService);

  nombre = ''; correo = ''; password = '';
  modoRegistro = signal(false);
  cargando = signal(false);
  error = signal('');

  cambiarModo() { this.modoRegistro.update(v => !v); this.error.set(''); }

  enviar(valido: boolean) {
    this.error.set('');
    if (!valido || (this.modoRegistro() && !this.nombre.trim())) {
      this.error.set('Completa todos los campos con datos válidos (contraseña de al menos 6 caracteres).');
      return;
    }
    this.cargando.set(true);
    if (this.modoRegistro()) {
      this.auth.registrar(this.nombre.trim(), this.correo, this.password).subscribe({
        next: () => { this.aviso.ok('Cuenta creada. Ya puedes iniciar sesión'); this.modoRegistro.set(false); this.cargando.set(false); },
        error: e => { this.aviso.error(e); this.cargando.set(false); },
      });
    } else {
      this.auth.login(this.correo, this.password).subscribe({
        next: () => { this.aviso.cerrar(); this.router.navigate(['/publicaciones']); },
        error: e => { this.aviso.error(e); this.cargando.set(false); },
      });
    }
  }
}
