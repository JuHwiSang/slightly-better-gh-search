<script lang="ts">
	import IconLucideSearch from '~icons/lucide/search';
	import IconLucideGitBranch from '~icons/lucide/git-branch';
	import IconLucideBarChart2 from '~icons/lucide/bar-chart-2';
	import IconLucideLogOut from '~icons/lucide/log-out';
	import IconLucideGithub from '~icons/lucide/github';
	import IconLucideUser from '~icons/lucide/user';
	import { authState } from '$lib/stores/auth.svelte';

	let showDropdown = $state(false);

	function toggleDropdown() {
		showDropdown = !showDropdown;
	}

	function closeDropdown() {
		showDropdown = false;
	}

	async function handleLogout() {
		await authState.signOut();
		closeDropdown();
	}

	async function handleGitHubLogin() {
		await authState.signInWithGitHub();
		closeDropdown();
	}
</script>

<svelte:window onclick={closeDropdown} />

<header class="flex w-full items-center justify-between px-6 py-4 whitespace-nowrap">
	<a href="/" class="flex items-center gap-3 transition-opacity select-none hover:opacity-80">
		<IconLucideSearch class="h-6 w-6 text-accent-blue" />
		<h2 class="font-display text-lg font-bold tracking-tight text-white">
			Slightly Better GH Search
		</h2>
	</a>

	<div class="relative">
		<button
			onclick={(e) => {
				e.stopPropagation();
				toggleDropdown();
			}}
			class="size-10 cursor-pointer rounded-full border transition-colors {authState.isAuthenticated
				? 'border-gray-700 bg-cover bg-center bg-no-repeat hover:border-accent-blue'
				: 'border-gray-600 bg-gray-800 hover:border-gray-500'}"
			style={authState.isAuthenticated
				? `background-image: url('${authState.user?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=GitScout'}');`
				: ''}
			aria-label="Profile menu"
		>
			{#if !authState.isAuthenticated}
				<IconLucideUser class="m-auto h-5 w-5 text-gray-400" />
			{/if}
		</button>

		{#if showDropdown}
			<div
				role="menu"
				tabindex="-1"
				class="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-lg border border-terminal-border bg-terminal-panel shadow-xl"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => {
					if (e.key === 'Escape') closeDropdown();
				}}
			>
				{#if !authState.isAuthenticated}
					<!-- Login Card -->
					<div class="p-6">
						<div class="mb-4 text-center">
							<div class="mb-2 text-sm font-semibold text-white">Not signed in</div>
							<p class="text-xs leading-relaxed text-text-muted">Sign in to start searching</p>
						</div>
						<button
							onclick={handleGitHubLogin}
							class="flex w-full items-center justify-center gap-2 rounded-lg border border-accent-blue bg-accent-blue/10 px-4 py-3 text-sm font-medium text-white transition-all hover:border-accent-blue/80 hover:bg-accent-blue/20"
						>
							<IconLucideGithub class="h-5 w-5" />
							<span>Sign in with GitHub</span>
						</button>
					</div>
				{:else}
					<!-- Profile Card -->
					<div class="border-b border-terminal-border p-4">
						<div class="flex items-center gap-3">
							<div
								class="size-12 rounded-full border border-gray-700 bg-cover bg-center bg-no-repeat"
								style="background-image: url('{authState.user?.avatar_url ||
									'https://api.dicebear.com/7.x/avataaars/svg?seed=GitScout'}');"
							></div>
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-semibold text-white">
									{authState.user?.name || 'User'}
								</p>
								<p class="truncate text-xs text-text-muted">{authState.user?.email || ''}</p>
							</div>
						</div>
					</div>

					<div class="border-b border-terminal-border p-3">
						<div class="mb-1 text-xs text-text-muted">API Usage</div>
						<div class="flex items-center gap-2">
							<div class="h-2 flex-1 overflow-hidden rounded-full bg-gray-700">
								<div class="h-full rounded-full bg-accent-blue" style="width: 75%;"></div>
							</div>
							<span class="font-mono text-xs text-white">75%</span>
						</div>
					</div>

					<div class="p-2">
						<a
							href="/profile"
							class="block rounded px-3 py-2 text-sm text-white transition-colors hover:bg-terminal-border"
						>
							Profile Settings
						</a>
						<button
							onclick={handleLogout}
							class="w-full rounded px-3 py-2 text-left text-sm text-white transition-colors hover:bg-terminal-border"
						>
							Log out
						</button>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</header>
