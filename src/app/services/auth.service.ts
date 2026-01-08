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
        
        // Update user state immediately
        this.updateUser(clerk);
        
        // Listen for Clerk events if available
        // Clerk.js v5 may use different event mechanisms
        if (clerk.addListener && typeof clerk.addListener === 'function') {
          try {
            clerk.addListener((event: any) => {
              console.log('🔔 Clerk event received:', event);
              this.updateUser(clerk);
            });
          } catch (error) {
            console.warn('Could not set up Clerk event listener:', error);
          }
        }
        
        // Set up a polling mechanism as fallback to check for user changes
        // This ensures we catch sign in/sign out even if events don't fire
        // Poll every 2 seconds (less aggressive than 1 second)
        const pollInterval = setInterval(() => {
          if (clerk && clerk.loaded) {
            this.updateUser(clerk);
          } else {
            // If Clerk is no longer available, clear the interval
            clearInterval(pollInterval);
          }
        }, 2000);
        
        // Store interval ID for cleanup if needed
        (window as any).clerkPollInterval = pollInterval;
        
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
    try {
      if (!clerk) {
        this.userSubject.next(null);
        return;
      }
      
      const currentUser = clerk.user || null;
      const currentValue = this.userSubject.value;
      
      // Compare user IDs to detect actual changes (not just reference changes)
      const currentUserId = currentUser?.id || null;
      const previousUserId = currentValue?.id || null;
      
      // Only update if user state actually changed
      if (currentUserId !== previousUserId) {
        if (currentUser) {
          console.log('👤 User signed in:', currentUser.id);
        } else {
          console.log('👤 User signed out');
        }
        this.userSubject.next(currentUser);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      // On error, set user to null as fallback
      this.userSubject.next(null);
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
    try {
      const clerk = await this.getClerk();
      if (!clerk) {
        console.error('Clerk instance not available for sign out');
        return;
      }
      
      // Make sure Clerk is loaded
      if (!clerk.loaded) {
        await clerk.load();
      }
      
      console.log('🚪 Signing out...');
      await clerk.signOut();
      
      // Update user state immediately
      this.userSubject.next(null);
      console.log('✅ Signed out successfully');
    } catch (error) {
      console.error('❌ Error signing out:', error);
      // Still update user state to null on error
      this.userSubject.next(null);
    }
  }

  async openSignIn(): Promise<void> {
    try {
      // Wait for Clerk to finish loading if it's still loading
      if (this.clerkLoading) {
        await this.clerkLoading;
      }
      
      const clerk = await this.getClerk();
      
      if (!clerk) {
        console.error('Clerk instance not available');
        alert('Clerk authentication is not ready. Please refresh the page.');
        return;
      }
      
      // Make sure Clerk is loaded
      if (!clerk.loaded) {
        await clerk.load();
      }
      
      // Check if user is already signed in
      if (clerk.user) {
        console.log('User is already signed in');
        this.updateUser(clerk);
        return;
      }
      
      console.log('🔐 Opening sign in modal...');
      
      // Open sign in modal
      if (typeof clerk.openSignIn === 'function') {
        await clerk.openSignIn();
        // Update user state after opening (Clerk will handle the modal)
        // We'll rely on the interval check to update state after successful sign in
      } else {
        console.error('openSignIn method not available on Clerk instance');
        alert('Sign in is not available. Please refresh the page.');
      }
    } catch (error) {
      console.error('❌ Error opening sign in:', error);
      alert('Failed to open sign in. Please try again.');
    }
  }

  isAdmin(): Observable<boolean> {
    return this.user$.pipe(
      map((user: any) => user && (user.publicMetadata as any)?.role === 'admin')
    );
  }
}

