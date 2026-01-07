import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, Product } from '../services/product.service';
import { AuthService } from '../services/auth.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {
  products$!: Observable<Product[]>;
  showForm = false;
  editingProduct: Product | null = null;
  
  productForm = {
    name: '',
    price: 0,
    description: '',
    category: '',
    image: null as File | null
  };

  categories = ['Furniture', 'Electronics', 'Lighting', 'Decor', 'Accessories', 'Other'];
  loading = false;
  error = '';

  constructor(
    private productService: ProductService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.products$ = this.productService.getProducts();
  }

  async getToken(): Promise<string> {
    const token = await this.authService.getToken();
    return token || '';
  }

  openAddForm(): void {
    this.editingProduct = null;
    this.productForm = {
      name: '',
      price: 0,
      description: '',
      category: '',
      image: null
    };
    this.showForm = true;
    this.error = '';
  }

  openEditForm(product: Product): void {
    this.editingProduct = product;
    this.productForm = {
      name: product.name,
      price: product.price,
      description: product.description,
      category: product.category,
      image: null
    };
    this.showForm = true;
    this.error = '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.productForm.image = input.files[0];
    }
  }

  async submitForm(): Promise<void> {
    if (!this.productForm.name || !this.productForm.price || !this.productForm.description || !this.productForm.category) {
      this.error = 'Please fill in all required fields';
      return;
    }

    if (!this.editingProduct && !this.productForm.image) {
      this.error = 'Please select an image';
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      const token = await this.getToken();
      const formData = new FormData();
      formData.append('name', this.productForm.name);
      formData.append('price', this.productForm.price.toString());
      formData.append('description', this.productForm.description);
      formData.append('category', this.productForm.category);
      
      if (this.productForm.image) {
        formData.append('image', this.productForm.image);
      }

      if (this.editingProduct) {
        await this.productService.updateProduct(this.editingProduct._id || this.editingProduct.id || '', formData, token).toPromise();
      } else {
        await this.productService.createProduct(formData, token).toPromise();
      }

      this.loadProducts();
      this.showForm = false;
      this.productForm = {
        name: '',
        price: 0,
        description: '',
        category: '',
        image: null
      };
    } catch (error: any) {
      this.error = error.error?.error || 'Failed to save product';
      console.error('Error saving product:', error);
    } finally {
      this.loading = false;
    }
  }

  async deleteProduct(product: Product): Promise<void> {
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) {
      return;
    }

    try {
      const token = await this.getToken();
      await this.productService.deleteProduct(product._id || product.id || '', token).toPromise();
      this.loadProducts();
    } catch (error: any) {
      this.error = error.error?.error || 'Failed to delete product';
      console.error('Error deleting product:', error);
    }
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingProduct = null;
    this.productForm = {
      name: '',
      price: 0,
      description: '',
      category: '',
      image: null
    };
    this.error = '';
  }
}

