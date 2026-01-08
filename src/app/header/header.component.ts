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
  isSigningIn = false;
  isSigningOut = false;

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

  async signIn(): Promise<void> {
    if (this.isSigningIn) return;
    
    this.isSigningIn = true;
    try {
      await this.authService.openSignIn();
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      // Reset after a delay to allow Clerk modal to open
      setTimeout(() => {
        this.isSigningIn = false;
      }, 500);
    }
  }

  async signOut(): Promise<void> {
    if (this.isSigningOut) return;
    
    this.isSigningOut = true;
    try {
      await this.authService.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      this.isSigningOut = false;
    }
  }
}
