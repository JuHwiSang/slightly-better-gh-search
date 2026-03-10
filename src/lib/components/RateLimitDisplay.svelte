<script lang="ts">
	import IconLucideActivity from '~icons/lucide/activity';
	import IconLucideClock from '~icons/lucide/clock';
	import IconLucideDatabase from '~icons/lucide/database';
	import IconLucideSearch from '~icons/lucide/search';

	interface Props {
		searchUsed: number;
		searchRemaining: number;
		searchReset: string | null;
		repoUsed: number;
		repoRemaining: number;
		repoReset: string | null;
		variant?: 'compact' | 'full';
	}

	let {
		searchUsed,
		searchRemaining,
		searchReset,
		repoUsed,
		repoRemaining,
		repoReset,
		variant = 'full'
	}: Props = $props();

	let displaySearchUsed = $state(0);
	let displaySearchRemaining = $state(0);
	let displayRepoUsed = $state(0);
	let displayRepoRemaining = $state(0);

	// Calculate total limits when initialized
	let searchTotal = $derived(searchUsed + searchRemaining);
	let repoTotal = $derived(repoUsed + repoRemaining);

	$effect(() => {
		if (searchReset) {
			const resetTime = new Date(searchReset).getTime();
			const now = Date.now();
			if (now >= resetTime) {
				displaySearchUsed = 0;
				displaySearchRemaining = searchTotal;
			} else {
				displaySearchUsed = searchUsed;
				displaySearchRemaining = searchRemaining;
				const timeoutId = setTimeout(() => {
					displaySearchUsed = 0;
					displaySearchRemaining = searchTotal;
				}, resetTime - now);
				return () => clearTimeout(timeoutId);
			}
		} else {
			displaySearchUsed = searchUsed;
			displaySearchRemaining = searchRemaining;
		}
	});

	$effect(() => {
		if (repoReset) {
			const resetTime = new Date(repoReset).getTime();
			const now = Date.now();
			if (now >= resetTime) {
				displayRepoUsed = 0;
				displayRepoRemaining = repoTotal;
			} else {
				displayRepoUsed = repoUsed;
				displayRepoRemaining = repoRemaining;
				const timeoutId = setTimeout(() => {
					displayRepoUsed = 0;
					displayRepoRemaining = repoTotal;
				}, resetTime - now);
				return () => clearTimeout(timeoutId);
			}
		} else {
			displayRepoUsed = repoUsed;
			displayRepoRemaining = repoRemaining;
		}
	});

	// Formatting helper for time
	const formatTime = (isoString: string | null) => {
		if (!isoString) return 'N/A';
		const date = new Date(isoString);
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	};
</script>

{#if variant === 'compact'}
	<div class="flex flex-col gap-2 p-4 text-xs">
		<div class="flex items-center justify-between text-text-muted">
			<div class="flex items-center gap-1.5 font-medium">
				<IconLucideSearch class="h-3.5 w-3.5" />
				<span>Search API</span>
			</div>
			<div class="flex items-center gap-1">
				<span class={displaySearchRemaining <= 2 ? 'text-red-400 font-bold' : 'text-white'}>{displaySearchRemaining}</span>
				<span class="text-slate-500">/ {searchTotal}</span>
			</div>
		</div>
		<div class="flex items-center justify-between text-text-muted">
			<div class="flex items-center gap-1.5 font-medium">
				<IconLucideDatabase class="h-3.5 w-3.5" />
				<span>Repo API</span>
			</div>
			<div class="flex items-center gap-1">
				<span class={displayRepoRemaining <= 100 ? 'text-red-400 font-bold' : 'text-white'}>{displayRepoRemaining}</span>
				<span class="text-slate-500">/ {repoTotal}</span>
			</div>
		</div>
	</div>
{:else}
	<section class="overflow-hidden rounded-xl border border-border-dark bg-card-dark shadow-sm">
		<div class="flex flex-col gap-6 p-6 md:p-8">
			<div class="flex items-center gap-3">
				<div class="rounded-lg bg-slate-800 p-2 text-accent-blue">
					<IconLucideActivity class="h-5 w-5" />
				</div>
				<div>
					<h3 class="font-display text-lg font-bold text-white">API Usage</h3>
					<p class="text-sm text-text-muted">Monitor your GitHub rate limit status</p>
				</div>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<!-- Search Limit Card -->
				<div class="rounded-lg border border-slate-700 bg-[#1a2230] p-4 text-sm">
					<div class="mb-3 flex items-center justify-between">
						<div class="flex items-center gap-2 font-medium text-white">
							<IconLucideSearch class="h-4 w-4 text-slate-400" />
							<span>Code Search API</span>
						</div>
					</div>
					<div class="mb-4">
						<div class="mb-2 flex items-end justify-between">
							<span class="text-3xl font-bold text-white">{displaySearchRemaining}</span>
							<span class="mb-1 text-slate-400">remaining / {searchTotal}</span>
						</div>
						<div class="h-2 w-full overflow-hidden rounded-full bg-slate-800">
							<div
								class="h-full bg-accent-blue transition-all duration-500"
								style="width: {searchTotal > 0 ? (displaySearchRemaining / searchTotal) * 100 : 0}%"
							></div>
						</div>
					</div>
					{#if displaySearchRemaining < searchTotal}
						<div class="flex items-center gap-1.5 text-xs text-text-muted">
							<IconLucideClock class="h-3.5 w-3.5" />
							<span>Resets at {formatTime(searchReset)}</span>
						</div>
					{/if}
				</div>

				<!-- Repo Limit Card -->
				<div class="rounded-lg border border-slate-700 bg-[#1a2230] p-4 text-sm">
					<div class="mb-3 flex items-center justify-between">
						<div class="flex items-center gap-2 font-medium text-white">
							<IconLucideDatabase class="h-4 w-4 text-slate-400" />
							<span>Repository API</span>
						</div>
					</div>
					<div class="mb-4">
						<div class="mb-2 flex items-end justify-between">
							<span class="text-3xl font-bold text-white">{displayRepoRemaining}</span>
							<span class="mb-1 text-slate-400">remaining / {repoTotal}</span>
						</div>
						<div class="h-2 w-full overflow-hidden rounded-full bg-slate-800">
							<div
								class="h-full bg-indigo-500 transition-all duration-500"
								style="width: {repoTotal > 0 ? (displayRepoRemaining / repoTotal) * 100 : 0}%"
							></div>
						</div>
					</div>
					{#if displayRepoRemaining < repoTotal}
						<div class="flex items-center gap-1.5 text-xs text-text-muted">
							<IconLucideClock class="h-3.5 w-3.5" />
							<span>Resets at {formatTime(repoReset)}</span>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</section>
{/if}
