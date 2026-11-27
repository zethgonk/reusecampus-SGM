import { Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

// Mensajes visibles para el usuario (éxito / error)
@Injectable({ providedIn: 'root' })
export class AvisoService {
  readonly mensaje = signal<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  private t: any;

  ok(texto: string) { this.mostrar('ok', texto); }
  error(err: unknown) {
    let texto = 'Ocurrió un error inesperado';
    if (err instanceof HttpErrorResponse) {
      texto = err.status === 0
        ? 'No se pudo conectar con el servidor. Verifica que la API esté en ejecución.'
        : err.error?.mensaje ?? `Error ${err.status}`;
    }
    this.mostrar('error', texto);
  }
  private mostrar(tipo: 'ok' | 'error', texto: string) {
    this.mensaje.set({ tipo, texto });
    clearTimeout(this.t);
    this.t = setTimeout(() => this.mensaje.set(null), 5000);
  }
  cerrar() { this.mensaje.set(null); }
}
