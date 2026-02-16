<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import SearchResultCard from '$lib/components/SearchResultCard.svelte';
	import InfiniteScroll from '$lib/components/InfiniteScroll.svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount, untrack } from 'svelte';
	import { supabase } from '$lib/supabase';
	import { FunctionsHttpError } from '@supabase/supabase-js';
	import type { SearchResponse, SearchResultItem } from '$lib/types/search';

	// Read URL parameters
	let query = $derived($page.url.searchParams.get('query') || '');
	let filter = $derived($page.url.searchParams.get('filter') || '');

	// State management
	let results = $state<SearchResultItem[]>([]);
	let nextCursor = $state<string | null>(null);
	let totalCount = $state<number>(0);
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let incompleteResults = $state(false);
	let hasMore = $derived(nextCursor !== null);

	// Redirect to main page if no query parameter
	onMount(() => {
		if (!query) {
			goto('/');
		}
	});

	// Watch for query/filter changes and reload
	$effect(() => {
		// Read dependencies (tracked)
		const currentQuery = query;
		const currentFilter = filter;

		if (currentQuery) {
			results = [];
			nextCursor = null;
			totalCount = 0;
			incompleteResults = false;
			error = null;
			// untracked to prevent re-triggering
			untrack(() => {
				loadResults();
			});
		}
	});

	// TODO: Edge Function을 GET → POST로 변경 후, invoke('search', { body: {...} }) 패턴으로 클린업
	async function loadResults(cursor: string | null = null) {
		if (isLoading) return;

		isLoading = true;
		error = null;

		try {
			// Build search params
			const params = new URLSearchParams();
			params.set('query', query);
			if (filter) params.set('filter', filter);
			if (cursor) params.set('cursor', cursor);
			params.set('limit', '10');

			// Call Supabase Edge Function via SDK
			const { data, error: invokeError } = await supabase.functions.invoke(
				`search?${params.toString()}`,
				{ method: 'GET' }
			);

			if (invokeError) {
				if (invokeError instanceof FunctionsHttpError) {
					const errorData = await invokeError.context.json();
					throw new Error(errorData.error || 'Search failed');
				}
				throw new Error(invokeError.message || 'Search failed');
			}

			const searchData = data as SearchResponse;

			// Update state
			if (cursor) {
				// Append to existing results
				results = [...results, ...searchData.items];
			} else {
				// Replace results (initial load)
				results = searchData.items;
			}

			nextCursor = searchData.next_cursor;
			totalCount = searchData.total_count;
			incompleteResults = incompleteResults || searchData.incomplete_results;
		} catch (err) {
			console.error('Search error:', err);
			error = err instanceof Error ? err.message : 'Failed to load search results';
		} finally {
			isLoading = false;
		}
	}

	function loadMore() {
		if (nextCursor && !isLoading) {
			loadResults(nextCursor);
		}
	}
</script>

<div class="flex min-h-screen flex-col">
	<Header />

	<main class="mx-auto flex w-full max-w-[1024px] flex-1 flex-col gap-6 px-4 py-8">
		<!-- Search Bar Section -->
		<section class="flex flex-col gap-4">
			<SearchBar variant="search" {query} {filter} />
		</section>

		<!-- Incomplete Results Warning -->
		{#if incompleteResults}
			<div
				class="rounded-lg border border-yellow-600/50 bg-yellow-600/10 px-4 py-3 font-mono text-sm text-yellow-400"
			>
				⚠ GitHub API timed out. Results may be incomplete.
			</div>
		{/if}

		<!-- Results Count -->
		{#if results.length > 0 || isLoading}
			<div class="mt-2 flex items-center justify-between border-b border-terminal-border pb-2">
				<h2 class="font-mono text-sm text-text-muted">
					{#if totalCount > 0}
						Showing {results.length.toLocaleString()} of {totalCount.toLocaleString()} results
					{:else}
						Loading results...
					{/if}
				</h2>
			</div>
		{/if}

		<!-- Results List -->
		{#if results.length > 0}
			<div class="flex flex-col gap-8">
				{#each results as result (result.sha)}
					<SearchResultCard {result} />
				{/each}
			</div>

			<!-- Infinite Scroll Component -->
			<InfiniteScroll {hasMore} {isLoading} {error} onLoadMore={loadMore} />
		{:else if !isLoading && !error}
			<div class="flex flex-col items-center gap-4 py-16">
				<p class="font-mono text-lg text-text-muted">No results found</p>
				<p class="font-mono text-sm text-text-muted">Try adjusting your search query or filter</p>
			</div>
		{:else if error && results.length === 0}
			<div class="flex flex-col items-center gap-4 py-16">
				<p class="font-mono text-sm text-red-400">{error}</p>
				<button
					onclick={() => loadResults()}
					class="rounded border border-terminal-border bg-terminal-panel px-4 py-2 font-mono text-sm text-text-muted transition-colors hover:bg-[#21262d]"
				>
					Retry
				</button>
			</div>
		{/if}

		<!-- Initial Loading State -->
		{#if isLoading && results.length === 0}
			<div class="flex items-center justify-center py-16">
				<div class="flex items-center gap-2 text-text-muted">
					<div class="h-5 w-5 animate-spin rounded-full border-2 border-accent-blue border-t-transparent"></div>
					<span class="font-mono text-sm">Searching...</span>
				</div>
			</div>
		{/if}
	</main>
</div>
