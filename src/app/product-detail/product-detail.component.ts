import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProductService, Product } from '../services/product.service';
import { CartService } from '../services/cart.service';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './product-detail.component.html',
  styleUrl: './product-detail.component.css'
})
export class ProductDetailComponent implements OnInit {
  product$!: Observable<Product | undefined>;

  constructor(
    private route: ActivatedRoute,
    private productService: ProductService,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    this.product$ = this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id') || '';
        return this.productService.getProduct(id);
      })
    );
  }

  addToCart(product: Product) {
    this.cartService.addToCart(product);
  }
}
