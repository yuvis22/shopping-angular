import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userSubject = new BehaviorSubject<any>(null);
  public user$ = this.userSubject.asObservable();
  private clerkInstance: any = null;
  private clerkLoading: Promise<any> | null = null;

  constructor() {
    this.initializeClerk();
  }

  private async initializeClerk(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    // Use dynamic import to load Clerk from npm package
    // Clerk is exported as a named export: export { Clerk }
    this.clerkLoading = import('@clerk/clerk-js').then(async (ClerkModule) => {
      const publishableKey = 'pk_test_YW11c2luZy1waWthLTc1LmNsZXJrLmFjY291bnRzLmRldiQ';
      
      if (!publishableKey) {
        console.warn('⚠️ Clerk publishable key is not set');
        return null;
      }
      
      // Clerk is a named export, access it directly
      const { Clerk } = ClerkModule as { Clerk: any };
      
      if (!Clerk || typeof Clerk !== 'function') {
        console.error('Clerk constructor not found or invalid. Module keys:', Object.keys(ClerkModule));
        return null;
      }
      
      const clerk = new Clerk(publishableKey);
      this.clerkInstance = clerk;
      (window as any).Clerk = clerk;
      (window as any).clerkInstance = clerk;
      
      return clerk.load().then(() => {
        console.log('✅ Clerk loaded successfully');
        (window as any).clerkReady = true;
        this.updateUser(clerk);
        
        // Listen for user changes
        if (typeof clerk.addListener === 'function') {
          clerk.addListener((user: any) => {
            this.userSubject.next(user);
          });
        }
        
        if (clerk.user) {
          this.userSubject.next(clerk.user);
        }
        
        return clerk;
      }).catch((error: any) => {
        console.error('❌ Error loading Clerk:', error);
        (window as any).clerkReady = false;
        return null;
      });
    }).catch((error) => {
      console.error('❌ Failed to import Clerk:', error);
      (window as any).clerkReady = false;
      return null;
    });
  }

  private updateUser(clerk: any): void {
    if (clerk.user) {
      this.userSubject.next(clerk.user);
    }
  }

  async getClerk(): Promise<any> {
    // Wait for Clerk to finish loading if it's still loading
    if (this.clerkLoading) {
      await this.clerkLoading;
    }
    return this.clerkInstance || (window as any).Clerk;
  }

  async getToken(): Promise<string | null> {
    try {
      // Wait for Clerk to be fully loaded
      const clerk = await this.getClerk();
      if (!clerk) {
        console.error('Clerk instance not available');
        return null;
      }

      // Make sure Clerk is loaded
      if (!clerk.loaded) {
        await clerk.load();
      }

      // Get the current session - Clerk.js v5 uses clerk.session
      const session = clerk.session;
      if (!session) {
        console.error('No active session found. User may not be signed in.');
        return null;
      }

      // Get the token from the session
      // In Clerk.js, session.getToken() returns a Promise
      const token = await session.getToken();
      if (!token) {
        console.error('Failed to get token from session');
        return null;
      }

      return token;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  async signOut(): Promise<void> {
    const clerk = await this.getClerk();
    if (clerk) {
      await clerk.signOut();
      this.userSubject.next(null);
    }
  }

  async openSignIn(): Promise<void> {
    // Wait for Clerk to finish loading if it's still loading
    if (this.clerkLoading) {
      await this.clerkLoading;
    }
    
    const clerk = this.clerkInstance || (window as any).clerkInstance || (window as any).Clerk;
    
    if (clerk && typeof clerk.openSignIn === 'function') {
      try {
        clerk.openSignIn();
      } catch (error) {
        console.error('Error opening sign in:', error);
        alert('Failed to open sign in. Please try again.');
      }
    } else {
      console.error('Clerk not available:', {
        hasInstance: !!this.clerkInstance,
        hasWindowInstance: !!(window as any).clerkInstance,
        hasWindowClerk: !!(window as any).Clerk,
        clerkReady: (window as any).clerkReady
      });
      alert('Clerk authentication is not ready. Please refresh the page.');
    }
  }

  isAdmin(): Observable<boolean> {
    return this.user$.pipe(
      map((user: any) => user && (user.publicMetadata as any)?.role === 'admin')
    );
  }
}

