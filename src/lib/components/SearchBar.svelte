<script lang="ts">
	import IconLucideCornerDownLeft from '~icons/lucide/corner-down-left';
	import IconLucideGithub from '~icons/lucide/github';
	import IconLucideCircleHelp from '~icons/lucide/circle-help';
	import IconLucideLoaderCircle from '~icons/lucide/loader-circle';
	import { authState } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import { navigating } from '$app/stores';

	interface Props {
		variant?: 'main' | 'search';
		query?: string;
		filter?: string;
	}

	let { variant = 'main', query = $bindable(''), filter = $bindable('') }: Props = $props();

	// Reactive state for button disabled status
	let isQueryEmpty = $derived(!query.trim());
	let isSearching = $derived($navigating !== null);

	// Help popover state: 'search' | 'filter' | null
	let activeHelp: 'search' | 'filter' | null = $state(null);

	function toggleHelp(type: 'search' | 'filter') {
		activeHelp = activeHelp === type ? null : type;
	}

	function handleClickOutside(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (!target.closest('.help-popover') && !target.closest('.help-trigger')) {
			activeHelp = null;
		}
	}

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
		if (isSearching || !query.trim()) {
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

<svelte:window onclick={handleClickOutside} onkeydown={(e) => { if (e.key === 'Escape') activeHelp = null; }} />

<div
	class="w-full rounded-lg border border-terminal-border bg-terminal-panel font-mono shadow-2xl ring-1 ring-white/5 transition-all duration-300"
>
	<div class="flex flex-col gap-5 p-6 md:p-8">
		<!-- Search Input -->
		<div class="relative">
			<div class="group flex items-baseline gap-4">
				<label
					for="search-input"
					class="flex min-w-[70px] items-center justify-end gap-1 text-lg font-bold text-accent-green select-none"
				>
					Search:
					<button
						type="button"
						class="help-trigger text-accent-green/50 transition-colors hover:text-accent-green"
						onclick={(e) => { e.stopPropagation(); toggleHelp('search'); }}
						aria-label="Search help"
					>
						<IconLucideCircleHelp class="h-3.5 w-3.5" />
					</button>
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
			{#if activeHelp === 'search'}
				<div
					class="help-popover absolute top-full left-0 z-50 mt-2 w-full rounded border border-accent-green/30 bg-[#0d1117] p-4 font-mono text-sm shadow-lg"
				>
					<p class="mb-2 font-bold text-accent-green">GitHub Code Search API</p>
					<p class="mb-3 text-text-muted">
						Sent directly to GitHub's Code Search API. Supports GitHub search qualifiers.
					</p>
					<p class="mb-1 text-xs font-bold text-gray-400">Qualifiers:</p>
					<ul class="mb-3 space-y-0.5 text-xs text-text-muted">
						<li><code class="text-accent-green">language:</code> — filter by language (e.g. typescript, python)</li>
						<li><code class="text-accent-green">repo:</code> — specific repo (e.g. sveltejs/svelte)</li>
						<li><code class="text-accent-green">path:</code> — file path (e.g. src/lib/)</li>
						<li><code class="text-accent-green">extension:</code> — file extension (e.g. ts, js)</li>
					</ul>
					<p class="mb-1 text-xs font-bold text-gray-400">Examples:</p>
					<div class="space-y-1 text-xs">
						<code class="block text-white">useState language:typescript</code>
						<code class="block text-white">repo:sveltejs/svelte onMount</code>
						<code class="block text-white">path:src/ extension:ts async function</code>
					</div>
				</div>
			{/if}
		</div>

		<!-- Filter Input -->
		<div class="relative">
			<div class="group flex items-baseline gap-4">
				<label
					for="filter-input"
					class="flex min-w-[70px] items-center justify-end gap-1 text-lg font-bold text-accent-blue select-none"
				>
					Filter:
					<button
						type="button"
						class="help-trigger text-accent-blue/50 transition-colors hover:text-accent-blue"
						onclick={(e) => { e.stopPropagation(); toggleHelp('filter'); }}
						aria-label="Filter help"
					>
						<IconLucideCircleHelp class="h-3.5 w-3.5" />
					</button>
				</label>
				<input
					id="filter-input"
					type="text"
					bind:value={filter}
					onkeydown={handleKeyDown}
					placeholder="filter expression..."
					class="flex-1 border-none bg-transparent p-0 font-mono text-lg text-white placeholder-gray-500 caret-accent-blue focus:ring-0"
				/>
			</div>
			{#if activeHelp === 'filter'}
				<div
					class="help-popover absolute top-full left-0 z-50 mt-2 w-full rounded border border-accent-blue/30 bg-[#0d1117] p-4 font-mono text-sm shadow-lg"
				>
					<p class="mb-2 font-bold text-accent-blue">Post-filter (Filtrex Expression)</p>
					<p class="mb-3 text-text-muted">
						Filters search results by repository metadata. Applied after GitHub search.
					</p>
					<p class="mb-1 text-xs font-bold text-gray-400">Numbers:</p>
					<div class="mb-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
						<span><code class="text-accent-blue">stars</code> <span class="text-text-muted">star count</span></span>
						<span><code class="text-accent-blue">forks</code> <span class="text-text-muted">fork count</span></span>
						<span><code class="text-accent-blue">watchers</code> <span class="text-text-muted">watcher count</span></span>
						<span><code class="text-accent-blue">issues</code> <span class="text-text-muted">open issue count</span></span>
						<span><code class="text-accent-blue">size</code> <span class="text-text-muted">repo size in KB</span></span>
						<span><code class="text-accent-blue">subscribers</code> <span class="text-text-muted">subscriber count</span></span>
						<span><code class="text-accent-blue">network</code> <span class="text-text-muted">fork network count</span></span>
					</div>
					<p class="mb-1 text-xs font-bold text-gray-400">Strings:</p>
					<div class="mb-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
						<span><code class="text-accent-blue">language</code> <span class="text-text-muted">primary language</span></span>
						<span><code class="text-accent-blue">name</code> <span class="text-text-muted">repo name</span></span>
						<span><code class="text-accent-blue">full_name</code> <span class="text-text-muted">owner/repo format</span></span>
						<span><code class="text-accent-blue">owner</code> <span class="text-text-muted">owner login name</span></span>
						<span><code class="text-accent-blue">owner_type</code> <span class="text-text-muted">"User" or "Organization"</span></span>
						<span><code class="text-accent-blue">description</code> <span class="text-text-muted">repo description</span></span>
						<span><code class="text-accent-blue">homepage</code> <span class="text-text-muted">homepage URL</span></span>
						<span><code class="text-accent-blue">license</code> <span class="text-text-muted">SPDX license ID (e.g. "MIT")</span></span>
						<span><code class="text-accent-blue">default_branch</code> <span class="text-text-muted">default branch name</span></span>
						<span><code class="text-accent-blue">visibility</code> <span class="text-text-muted">"public" or "private"</span></span>
					</div>
					<p class="mb-1 text-xs font-bold text-gray-400">Arrays:</p>
					<div class="mb-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
						<span><code class="text-accent-blue">topics</code> <span class="text-text-muted">topic tag list</span></span>
					</div>
					<p class="mb-1 text-xs font-bold text-gray-400">Booleans:</p>
					<div class="mb-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
						<span><code class="text-accent-blue">is_fork</code> <span class="text-text-muted">is a fork or not</span></span>
						<span><code class="text-accent-blue">is_private</code> <span class="text-text-muted">is private or not</span></span>
						<span><code class="text-accent-blue">archived</code> <span class="text-text-muted">is archived or not</span></span>
						<span><code class="text-accent-blue">disabled</code> <span class="text-text-muted">is disabled or not</span></span>
						<span><code class="text-accent-blue">is_template</code> <span class="text-text-muted">is a template or not</span></span>
						<span><code class="text-accent-blue">allow_forking</code> <span class="text-text-muted">allows forking or not</span></span>
						<span><code class="text-accent-blue">has_issues</code> <span class="text-text-muted">has issues enabled or not</span></span>
						<span><code class="text-accent-blue">has_wiki</code> <span class="text-text-muted">has wiki enabled or not</span></span>
						<span><code class="text-accent-blue">has_pages</code> <span class="text-text-muted">has GitHub Pages or not</span></span>
						<span><code class="text-accent-blue">has_downloads</code> <span class="text-text-muted">has downloads enabled or not</span></span>
						<span><code class="text-accent-blue">has_discussions</code> <span class="text-text-muted">has discussions enabled or not</span></span>
						<span><code class="text-accent-blue">has_projects</code> <span class="text-text-muted">has projects enabled or not</span></span>
					</div>
					<p class="mb-1 text-xs font-bold text-gray-400">Dates (ms timestamp):</p>
					<div class="mb-3 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
						<span><code class="text-accent-blue">created_at</code> <span class="text-text-muted">repo creation date</span></span>
						<span><code class="text-accent-blue">updated_at</code> <span class="text-text-muted">last update date</span></span>
						<span><code class="text-accent-blue">pushed_at</code> <span class="text-text-muted">last push date</span></span>
					</div>
					<p class="mb-1 text-xs font-bold text-gray-400">Operators:</p>
					<p class="mb-3 text-xs text-text-muted">
						<code class="text-white">==</code> <code class="text-white">!=</code>
						<code class="text-white">&gt;</code> <code class="text-white">&gt;=</code>
						<code class="text-white">&lt;</code> <code class="text-white">&lt;=</code>
						<code class="text-white">and</code> <code class="text-white">or</code>
						<code class="text-white">not</code> <code class="text-white">in</code>
					</p>
					<p class="mb-1 text-xs font-bold text-gray-400">Examples:</p>
					<div class="space-y-1 text-xs">
						<code class="block text-white">stars > 100</code>
						<code class="block text-white">language == "TypeScript"</code>
						<code class="block text-white">stars > 50 and not is_fork</code>
						<code class="block text-white">owner == "vercel" and forks > 10</code>
						<code class="block text-white">license == "MIT" and not archived</code>
						<code class="block text-white">"react" in topics</code>
						<code class="block text-white">created_at > 1704067200000</code>
						<code class="block text-text-muted">-- dates are ms timestamps (e.g. 2024-01-01 = 1704067200000)</code>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Status Bar -->
	<div
		class="flex items-center justify-between border-t border-terminal-border bg-[#0f1318] px-6 py-3 font-mono text-xs text-text-muted transition-colors duration-300 select-none"
	>
		<div></div>
		{#if !authState.isAuthenticated}
			<button
				onclick={handleGitHubLogin}
				class="group flex items-center gap-2 tracking-wider uppercase transition-colors hover:text-white"
			>
				<IconLucideGithub class="h-4 w-4" />
				<span>Sign in with GitHub</span>
				<IconLucideCornerDownLeft
					class="h-4 w-4 transition-transform group-hover:translate-x-0.5"
				/>
			</button>
		{:else}
			<button
				onclick={handleExecute}
				disabled={isQueryEmpty || isSearching}
				class="group flex items-center gap-2 tracking-wider uppercase transition-colors {isQueryEmpty || isSearching
					? 'cursor-not-allowed text-gray-600'
					: 'hover:text-white'}"
			>
				{#if isSearching}
					<IconLucideLoaderCircle class="h-4 w-4 animate-spin" />
					Searching...
				{:else}
					Execute
					<IconLucideCornerDownLeft
						class="h-4 w-4 transition-transform {isQueryEmpty ? '' : 'group-hover:translate-x-0.5'}"
					/>
				{/if}
			</button>
		{/if}
	</div>
</div>
