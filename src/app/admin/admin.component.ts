import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, Product } from '../services/product.service';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

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
  successMessage = '';
  imagePreview: string | null = null;
  apiError = false;

  constructor(
    private productService: ProductService,
    private authService: AuthService
  ) {
    // Initialize products$ in constructor to prevent blank page
    this.products$ = this.productService.getProducts().pipe(
      catchError((error) => {
        console.error('Error loading products:', error);
        this.apiError = true;
        this.error = 'Failed to load products. Make sure the backend server is running on http://localhost:3000';
        return of([]);
      })
    );
  }

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.products$ = this.productService.getProducts();
  }

  async getToken(): Promise<string> {
    const token = await this.authService.getToken();
    if (!token) {
      throw new Error('No authentication token available. Please sign in again.');
    }
    return token;
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
    this.imagePreview = null;
    this.showForm = true;
    this.error = '';
    this.successMessage = '';
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
    this.imagePreview = null;
    this.showForm = true;
    this.error = '';
    this.successMessage = '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      this.productForm.image = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.productForm.image = null;
    this.imagePreview = null;
    const input = document.getElementById('image') as HTMLInputElement;
    if (input) {
      input.value = '';
    }
  }

  async submitForm(): Promise<void> {
    // Validate required fields
    const name = (this.productForm.name || '').trim();
    const description = (this.productForm.description || '').trim();
    const category = (this.productForm.category || '').trim();
    const price = this.productForm.price;

    if (!name) {
      this.error = 'Please enter a product name';
      return;
    }

    if (price === null || price === undefined || price < 0) {
      this.error = 'Please enter a valid price (must be 0 or greater)';
      return;
    }

    if (!description) {
      this.error = 'Please enter a product description';
      return;
    }

    if (!category) {
      this.error = 'Please select a category';
      return;
    }

    if (!this.editingProduct && !this.productForm.image) {
      this.error = 'Please select an image';
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      let token: string;
      try {
        token = await this.getToken();
      } catch (tokenError: any) {
        this.error = tokenError.message || 'Authentication failed. Please sign in again.';
        this.loading = false;
        return;
      }

      const formData = new FormData();
      formData.append('name', name);
      formData.append('price', price.toString());
      formData.append('description', description);
      formData.append('category', category);
      
      if (this.productForm.image) {
        formData.append('image', this.productForm.image);
      }

      if (this.editingProduct) {
        await this.productService.updateProduct(this.editingProduct._id || this.editingProduct.id || '', formData, token).toPromise();
      } else {
        await this.productService.createProduct(formData, token).toPromise();
      }

      this.loadProducts();
      this.successMessage = this.editingProduct ? 'Product updated successfully!' : 'Product created successfully!';
      this.error = '';
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
      
      this.showForm = false;
      this.productForm = {
        name: '',
        price: 0,
        description: '',
        category: '',
        image: null
      };
      this.imagePreview = null;
    } catch (error: any) {
      this.error = error.error?.error || 'Failed to save product';
      this.successMessage = '';
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
      let token: string;
      try {
        token = await this.getToken();
      } catch (tokenError: any) {
        this.error = tokenError.message || 'Authentication failed. Please sign in again.';
        return;
      }

      await this.productService.deleteProduct(product._id || product.id || '', token).toPromise();
      this.loadProducts();
      this.successMessage = 'Product deleted successfully!';
      this.error = '';
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        this.successMessage = '';
      }, 3000);
    } catch (error: any) {
      this.error = error.error?.error || 'Failed to delete product';
      this.successMessage = '';
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
    this.imagePreview = null;
    this.error = '';
    this.successMessage = '';
  }
}

