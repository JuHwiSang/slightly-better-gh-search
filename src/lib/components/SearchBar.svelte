<script lang="ts">
	import IconLucideCornerDownLeft from '~icons/lucide/corner-down-left';
	import IconLucideGithub from '~icons/lucide/github';
	import { authState } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';

	interface Props {
		variant?: 'main' | 'search';
		initialQuery?: string;
		initialFilter?: string;
	}

	let { variant = 'main', initialQuery = '', initialFilter = '' }: Props = $props();

	// Search state
	let query = $state(initialQuery);
	let filter = $state(initialFilter);

	// TODO: Replace with actual GitHub OAuth login
	function handleGitHubLogin() {
		console.log('GitHub login clicked');
		authState.isAuthenticated = true;
	}

	function handleExecute() {
		// Validate query is not empty
		if (!query.trim()) {
			alert('Please enter a search query');
			return;
		}

		// Build URL with query parameters
		const params = new URLSearchParams();
		params.set('query', query.trim());
		params.set('filter', filter.trim());

		goto(`/search?${params.toString()}`);
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
				placeholder="regex pattern..."
				class="flex-1 border-none bg-transparent p-0 font-mono text-lg text-white placeholder-gray-500 caret-accent-blue focus:ring-0"
			/>
		</div>
	</div>

	<!-- Status Bar -->
	<div
		class="flex items-center justify-end border-t border-terminal-border bg-[#0f1318] px-6 py-3 font-mono text-xs text-text-muted transition-colors duration-300 select-none"
	>
		{#if !authState.isAuthenticated}
			<button
				onclick={handleGitHubLogin}
				class="flex h-12 items-center justify-center gap-2.5 rounded-lg bg-accent-blue px-6 text-base font-medium text-white shadow-md transition-all hover:bg-blue-600 hover:shadow-lg active:scale-[0.98]"
			>
				<IconLucideGithub class="text-[20px]" />
				<span>Sign in with GitHub</span>
			</button>
		{:else}
			<button
				onclick={handleExecute}
				class="group flex items-center gap-2 tracking-wider uppercase transition-colors hover:text-white"
			>
				Execute
				<IconLucideCornerDownLeft
					class="h-4 w-4 transition-transform group-hover:translate-x-0.5"
				/>
			</button>
		{/if}
	</div>
</div>
