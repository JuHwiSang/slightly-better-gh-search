import { supabase } from '$lib/supabase';

export interface User {
    id: string;
    name: string;
    email: string;
    avatar_url: string;
}

class AuthState {
    user = $state<User | null>(null);
    isAuthenticated = $state(false);

    async signInWithGitHub(redirectPath?: string) {
        // Use provided path or current path as fallback
        const nextPath = redirectPath || (window.location.pathname + window.location.search);
        const callbackUrl = new URL('/auth/callback', window.location.origin);
        callbackUrl.searchParams.set('next', nextPath);

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'github',
            options: {
                redirectTo: callbackUrl.toString()
            }
        });

        if (error) {
            console.error('Login error:', error);
        }
    }

    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (!error) {
            this.user = null;
            this.isAuthenticated = false;
        }
    }

    async loadSession() {
        const {
            data: { session }
        } = await supabase.auth.getSession();

        if (session?.user) {
            this.user = {
                id: session.user.id,
                name: session.user.user_metadata.full_name || session.user.user_metadata.name || 'User',
                email: session.user.email || '',
                avatar_url: session.user.user_metadata.avatar_url || ''
            };
            this.isAuthenticated = true;
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                this.user = {
                    id: session.user.id,
                    name: session.user.user_metadata.full_name || session.user.user_metadata.name || 'User',
                    email: session.user.email || '',
                    avatar_url: session.user.user_metadata.avatar_url || ''
                };
                this.isAuthenticated = true;
            } else {
                this.user = null;
                this.isAuthenticated = false;
            }
        });
    }
}

export const authState = new AuthState();
