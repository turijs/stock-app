import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

export interface User {
  username: string,
  password: string,
  apiKey: string
}

export enum LoginEventTypes {
  Login,
  Logout
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  users: User[]
  currentUser: User | null
  loginEvents: Subject<LoginEventTypes> = new Subject();

  constructor(private router: Router) {
    this.users = JSON.parse(window.localStorage.getItem('users')) || [];
    this.currentUser = JSON.parse(window.localStorage.getItem('currentUser')) || null;
  }

  signUp(username: string, password: string, apiKey: string) {
    // check for existing user with same name
    let conflictingUser = this.users.find(u => u.username === username);

    if (conflictingUser) {
      throw 'This username is already taken';
    }

    this.users.push({ username, password, apiKey });

    return this.login(username, password);
  }

  login(username: string, password: string) {
    let user = this.users.find(u => u.username === username);

    if (!user || user.password !== password) {
      throw 'You entered an incorrect username or password';
    }

    this.currentUser = user;
    this.persist();
    this.loginEvents.next(LoginEventTypes.Login);

    return true;
  }

  logout() {
    this.currentUser = null;
    this.persist();
    this.loginEvents.next(LoginEventTypes.Logout);
    this.router.navigate(['/auth']);
  }

  get isLoggedIn(): boolean {
    return this.currentUser !== null;
  }

  get apiKey() {
    return this.isLoggedIn ? this.currentUser.apiKey : null;
  }

  get username() {
    return this.isLoggedIn ? this.currentUser.username : null;
  }

  private persist() {
    window.localStorage.setItem('users', JSON.stringify(this.users));
    window.localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
  }
}
