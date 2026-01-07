import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Product } from './product.service';

export interface CartItem {
  product: Product;
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private itemsSubject = new BehaviorSubject<CartItem[]>([]);
  items$ = this.itemsSubject.asObservable();

  constructor() { }

  addToCart(product: Product) {
    if (!product.id) {
      console.error('Product ID is missing');
      return;
    }
    const currentItems = this.itemsSubject.value;
    const existingItem = currentItems.find(item => item.product.id === product.id);

    if (existingItem) {
      existingItem.quantity += 1;
      this.itemsSubject.next([...currentItems]);
    } else {
      this.itemsSubject.next([...currentItems, { product, quantity: 1 }]);
    }
  }

  removeFromCart(productId: string | undefined) {
    if (!productId) return;
    const currentItems = this.itemsSubject.value;
    const updatedItems = currentItems.filter(item => item.product.id !== productId);
    this.itemsSubject.next(updatedItems);
  }

  clearCart() {
    this.itemsSubject.next([]);
  }

  getCount() {
    return this.itemsSubject.value.reduce((acc, item) => acc + item.quantity, 0);
  }

  getTotalPrice() {
    return this.itemsSubject.value.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  }
}
