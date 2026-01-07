import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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

  getProducts(): Observable<Product[]> {
    return this.http
      .get<Product[]>(this.apiUrl)
      .pipe(map((products) => products.map((p) => ({ ...p, id: p._id || p.id }))));
  }

  getProduct(id: string): Observable<Product | undefined> {
    return this.http
      .get<Product>(`${this.apiUrl}/${id}`)
      .pipe(map((product) => ({ ...product, id: product._id || product.id })));
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
