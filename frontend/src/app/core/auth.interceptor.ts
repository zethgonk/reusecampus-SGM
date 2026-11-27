import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

// Agrega el token JWT a cada petición y cierra sesión si el servidor responde 401
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token;
  if (token) req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  return next(req).pipe(
    catchError(err => {
      if (err.status === 401 && !req.url.endsWith('/auth/login') && auth.logueado()) auth.logout();
      return throwError(() => err);
    })
  );
};
