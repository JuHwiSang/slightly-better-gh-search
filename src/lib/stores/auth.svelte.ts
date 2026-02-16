import { supabase } from "$lib/supabase";

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
        const nextPath = redirectPath ||
            (window.location.pathname + window.location.search);
        const callbackUrl = new URL("/auth/callback", window.location.origin);
        callbackUrl.searchParams.set("next", nextPath);

        const { error } = await supabase.auth.signInWithOAuth({
            provider: "github",
            options: {
                redirectTo: callbackUrl.toString(),
            },
        });

        if (error) {
            console.error("Login error:", error);
        }
    }

    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (!error) {
            this.user = null;
            this.isAuthenticated = false;
        }
    }

    // NOTE: getSession()은 Supabase SDK 경고를 유발하지만, 의도적으로 유지함.
    // - 이 경고는 서버(SSR)에서 session.user를 권한 판단에 사용할 때 위험함
    //   (JWT 클레임 변조 → 권한 상승 가능)
    //   (getSession()은 JWT 검증 없이 파싱만 해 리턴하기 때문)
    // - 클라이언트에서 UI 표시용(이름, 아바타)으로 쓰는 건 실질적 위험 없음
    //   (localStorage 변조 가능 시점 = 이미 XSS → 세션 탈취가 더 큰 위협)
    // - getUser()로 대체하면 매번 Auth 서버 네트워크 요청이 추가됨
    // - 서버 측은 hooks.server.ts의 safeGetSession에서 getUser()로 검증 중 ✅
    async loadSession() {
        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
            this.user = {
                id: session.user.id,
                name: session.user.user_metadata.full_name ||
                    session.user.user_metadata.name || "User",
                email: session.user.email || "",
                avatar_url: session.user.user_metadata.avatar_url || "",
            };
            this.isAuthenticated = true;
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                this.user = {
                    id: session.user.id,
                    name: session.user.user_metadata.full_name ||
                        session.user.user_metadata.name || "User",
                    email: session.user.email || "",
                    avatar_url: session.user.user_metadata.avatar_url || "",
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
