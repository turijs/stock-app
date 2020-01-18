import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';

import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router, private auth: AuthService) {}

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree {
    if (state.url === '/auth') {
      return this.auth.isLoggedIn ? this.router.createUrlTree(['/']) : true;
    } else {
      return this.auth.isLoggedIn ? true :this.router.createUrlTree(['/auth']);
    }    
  }
  
}
