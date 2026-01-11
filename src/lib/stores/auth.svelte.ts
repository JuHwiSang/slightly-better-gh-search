export interface User {
    id: string;
    name: string;
    email: string;
    avatar_url: string;
}

class AuthState {
    user = $state<User | null>(null);
    isAuthenticated = $state(false);

    login(userData: User) {
        this.user = userData;
        this.isAuthenticated = true;
    }

    logout() {
        this.user = null;
        this.isAuthenticated = false;
    }
}

export const authState = new AuthState();

// TODO: Integrate with Supabase Auth
// For now, this is a placeholder state
