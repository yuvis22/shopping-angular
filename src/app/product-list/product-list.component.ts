import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductService, Product } from '../services/product.service';
import { CartService } from '../services/cart.service';
import { ProductCardComponent } from '../product-card/product-card.component';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, ProductCardComponent],
  templateUrl: './product-list.component.html',
  styleUrl: './product-list.component.css'
})
export class ProductListComponent implements OnInit {
  products$!: Observable<Product[]>;

  constructor(
    private productService: ProductService,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    this.products$ = this.productService.getProducts();
  }

  addToCart(product: Product) {
    this.cartService.addToCart(product);
  }
}
