import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl, Validators} from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss']
})
export class AuthComponent implements OnInit {
  loginForm = new FormGroup({
    username: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required]),
  })
  loginError: string

  signUpForm = new FormGroup({
    username: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required]),
    apiKey: new FormControl('', [Validators.required]),
  })
  signUpError: string

  constructor(private auth: AuthService, private router: Router) {}

  onLogin() {
    if (this.loginForm.valid) {
      this.loginError = '';

      const {username, password} = this.loginForm.value;
      try {
        this.auth.login(username, password);
        this.router.navigate(['/']);
      } catch(e) {
        this.loginError = e;
      }
    }
  }

  onSignUp() {
    if (this.signUpForm.valid) {
      this.signUpError = '';

      const {username, password, apiKey} = this.signUpForm.value;
      try {
        this.auth.signUp(username, password, apiKey);
        this.router.navigate(['/']);
      } catch(e) {
        this.signUpError = e;
      }
    }
  }

  ngOnInit() {}
}
