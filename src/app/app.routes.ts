import { Routes } from '@angular/router';
import { ProductListComponent } from './product-list/product-list.component';
import { ProductDetailComponent } from './product-detail/product-detail.component';
import { CartComponent } from './cart/cart.component';
import { AdminComponent } from './admin/admin.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: ProductListComponent },
  { path: 'product/:id', component: ProductDetailComponent },
  { path: 'cart', component: CartComponent },
  { path: 'admin', component: AdminComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];
