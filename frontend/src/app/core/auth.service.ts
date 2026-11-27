import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { Usuario } from './models';
import { environment } from './environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly usuario = signal<Usuario | null>(this.leer());
  readonly logueado = computed(() => this.usuario() !== null);
  readonly esAdmin = computed(() => this.usuario()?.rol === 'ADMIN');

  get token(): string | null {
    try { return localStorage.getItem('token'); } catch { return null; }
  }

  private leer(): Usuario | null {
    try { return JSON.parse(localStorage.getItem('usuario') ?? 'null'); } catch { return null; }
  }

  login(correo: string, password: string) {
    return this.http.post<{ token: string; usuario: Usuario }>(`${environment.apiUrl}/auth/login`, { correo, password })
      .pipe(tap(r => {
        localStorage.setItem('token', r.token);
        localStorage.setItem('usuario', JSON.stringify(r.usuario));
        this.usuario.set(r.usuario);
      }));
  }

  registrar(nombre: string, correo: string, password: string) {
    return this.http.post(`${environment.apiUrl}/usuarios`, { nombre, correo, password });
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    this.usuario.set(null);
    this.router.navigate(['/login']);
  }
}
