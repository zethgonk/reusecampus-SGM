import { Routes } from '@angular/router';
import { soloAdmin, soloLogueado } from './core/guards';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./pages/login').then(m => m.Login) },
  { path: 'publicaciones', canActivate: [soloLogueado], loadComponent: () => import('./pages/publicaciones').then(m => m.Publicaciones) },
  { path: 'mis-publicaciones', canActivate: [soloLogueado], loadComponent: () => import('./pages/mis-publicaciones').then(m => m.MisPublicaciones) },
  { path: 'mis-solicitudes', canActivate: [soloLogueado], loadComponent: () => import('./pages/mis-solicitudes').then(m => m.MisSolicitudes) },
  { path: 'entregas', canActivate: [soloLogueado], loadComponent: () => import('./pages/entregas').then(m => m.Entregas) },
  { path: 'admin', canActivate: [soloLogueado, soloAdmin], loadComponent: () => import('./pages/admin').then(m => m.Admin) },
  { path: '', pathMatch: 'full', redirectTo: 'publicaciones' },
  { path: '**', redirectTo: 'publicaciones' },
];
