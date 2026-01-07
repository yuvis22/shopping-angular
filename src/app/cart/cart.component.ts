import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService, CartItem } from '../services/cart.service';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './cart.component.html',
  styleUrl: './cart.component.css'
})
export class CartComponent implements OnInit {
  cartItems$: Observable<CartItem[]>;

  constructor(private cartService: CartService) {
    this.cartItems$ = this.cartService.items$;
  }

  ngOnInit(): void {}

  get total() {
    return this.cartService.getTotalPrice();
  }

  remove(id: string | undefined) {
    this.cartService.removeFromCart(id);
  }

  checkout() {
    alert('Proceeding to checkout! (Demo only)');
  }
}
