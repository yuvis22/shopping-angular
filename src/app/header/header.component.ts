import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CartService } from '../services/cart.service';
import { AuthService } from '../services/auth.service';
import { AsyncPipe, NgIf } from '@angular/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, AsyncPipe, NgIf],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {
  cartCount$: Observable<number>;
  user$: Observable<any>;
  isAdmin$: Observable<boolean>;

  constructor(
    private cartService: CartService,
    private authService: AuthService
  ) {
    this.cartCount$ = this.cartService.items$.pipe(
      map(items => items.reduce((acc, item) => acc + item.quantity, 0))
    );
    
    this.user$ = this.authService.user$;
    this.isAdmin$ = this.authService.isAdmin();
  }

  ngOnInit(): void {}

  signIn(): void {
    this.authService.openSignIn().catch(error => {
      console.error('Sign in error:', error);
    });
  }

  signOut(): void {
    this.authService.signOut();
  }
}
