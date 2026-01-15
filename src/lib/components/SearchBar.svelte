<script lang="ts">
	import IconLucideCornerDownLeft from '~icons/lucide/corner-down-left';
	import IconLucideGithub from '~icons/lucide/github';
	import { authState } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';

	interface Props {
		variant?: 'main' | 'search';
		query?: string;
		filter?: string;
	}

	let { variant = 'main', query = $bindable(''), filter = $bindable('') }: Props = $props();

	// Reactive state for button disabled status
	let isQueryEmpty = $derived(!query.trim());

	async function handleGitHubLogin() {
		// Build search URL with current query/filter to redirect after login
		const params = new URLSearchParams();
		params.set('query', query.trim());
		if (filter.trim()) {
			params.set('filter', filter.trim());
		}
		const redirectPath = `/search?${params.toString()}`;

		await authState.signInWithGitHub(redirectPath);
	}

	function handleExecute() {
		// Don't execute if query is empty
		if (!query.trim()) {
			return;
		}

		// Build URL with query parameters
		const params = new URLSearchParams();
		params.set('query', query.trim());
		params.set('filter', filter.trim());

		goto(`/search?${params.toString()}`);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			if (authState.isAuthenticated) {
				handleExecute();
			} else {
				handleGitHubLogin();
			}
		}
	}
</script>

<div
	class="w-full overflow-hidden rounded-lg border border-terminal-border bg-terminal-panel font-mono shadow-2xl ring-1 ring-white/5 transition-all duration-300"
>
	<div class="flex flex-col gap-5 p-6 md:p-8">
		<!-- Search Input -->
		<div class="group flex items-baseline gap-4">
			<label
				for="search-input"
				class="min-w-[70px] text-right text-lg font-bold text-accent-green select-none"
			>
				Search:
			</label>
			<input
				id="search-input"
				type="text"
				bind:value={query}
				onkeydown={handleKeyDown}
				placeholder="enter keyword..."
				class="flex-1 border-none bg-transparent p-0 font-mono text-lg text-white placeholder-gray-500 caret-accent-green focus:ring-0"
			/>
		</div>

		<!-- Filter Input -->
		<div class="group flex items-baseline gap-4">
			<label
				for="filter-input"
				class="min-w-[70px] text-right text-lg font-bold text-accent-blue select-none"
			>
				Filter:
			</label>
			<input
				id="filter-input"
				type="text"
				bind:value={filter}
				onkeydown={handleKeyDown}
				placeholder="regex pattern..."
				class="flex-1 border-none bg-transparent p-0 font-mono text-lg text-white placeholder-gray-500 caret-accent-blue focus:ring-0"
			/>
		</div>
	</div>

	<!-- Status Bar -->
	<div
		class="flex items-center justify-between border-t border-terminal-border bg-[#0f1318] px-6 py-3 font-mono text-xs text-text-muted transition-colors duration-300 select-none"
	>
		{#if !authState.isAuthenticated}
			<div></div>
			<button
				onclick={handleGitHubLogin}
				disabled={isQueryEmpty}
				class="flex h-12 items-center justify-center gap-2.5 rounded-lg px-6 text-base font-medium shadow-md transition-all {isQueryEmpty
					? 'cursor-not-allowed bg-gray-700 text-gray-500'
					: 'bg-accent-blue text-white hover:bg-blue-600 hover:shadow-lg active:scale-[0.98]'}"
			>
				<IconLucideGithub class="text-[20px]" />
				<span>Sign in with GitHub</span>
			</button>
			<div></div>
		{:else}
			<div></div>
			<button
				onclick={handleExecute}
				disabled={isQueryEmpty}
				class="group flex items-center gap-2 tracking-wider uppercase transition-colors {isQueryEmpty
					? 'cursor-not-allowed text-gray-600'
					: 'hover:text-white'}"
			>
				Execute
				<IconLucideCornerDownLeft
					class="h-4 w-4 transition-transform {isQueryEmpty ? '' : 'group-hover:translate-x-0.5'}"
				/>
			</button>
		{/if}
	</div>
</div>
