import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Product {
  _id?: string;
  id?: string;
  name: string;
  price: number;
  description: string;
  imageUrl: string;
  category: string;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private apiUrl = `${environment.apiUrl}/products`;

  constructor(private http: HttpClient) {}

  private normalizeImageUrl(imageUrl: string): string {
    // If URL is relative (starts with /api/images/), make it absolute
    if (imageUrl.startsWith('/api/images/')) {
      // Extract base URL from apiUrl (e.g., 'http://localhost:3000/api' -> 'http://localhost:3000')
      const baseUrl = environment.apiUrl.replace('/api', '');
      return `${baseUrl}${imageUrl}`;
    }
    // If already absolute, return as-is
    return imageUrl;
  }

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.apiUrl).pipe(
      map((products) =>
        products.map((p) => ({
          ...p,
          id: p._id || p.id,
          imageUrl: this.normalizeImageUrl(p.imageUrl),
        }))
      ),
      catchError((error) => {
        console.error('Error fetching products:', error);
        // Return empty array instead of erroring to prevent blank page
        return of([]);
      })
    );
  }

  getProduct(id: string): Observable<Product | undefined> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`).pipe(
      map((product) => ({
        ...product,
        id: product._id || product.id,
        imageUrl: this.normalizeImageUrl(product.imageUrl),
      }))
    );
  }

  createProduct(productData: FormData, token: string): Observable<Product> {
    return this.http.post<Product>(this.apiUrl, productData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  updateProduct(id: string, productData: FormData, token: string): Observable<Product> {
    return this.http.put<Product>(`${this.apiUrl}/${id}`, productData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  deleteProduct(id: string, token: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  }
}
