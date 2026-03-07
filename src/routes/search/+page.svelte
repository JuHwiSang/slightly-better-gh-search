<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import SearchResultCard from '$lib/components/SearchResultCard.svelte';
	import InfiniteScroll from '$lib/components/InfiniteScroll.svelte';
	import { supabase } from '$lib/supabase';
	import { FunctionsHttpError } from '@supabase/supabase-js';
	import type { SearchResponse, SearchResultItem } from '$lib/types/search';
	import type { PageData } from './$types';
	import { edgeFunctionRegion } from '$lib/config/region';

	// SSR data from +page.server.ts
	const { data }: { data: PageData } = $props();

	// State management — initialized from SSR data
	let results = $state<SearchResultItem[]>([]);
	let nextCursor = $state<string | null>(null);
	let totalCount = $state<number>(0);
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let incompleteResults = $state(false);
	let hasMore = $derived(nextCursor !== null);

	// Re-initialize when SSR data changes (e.g. new search via navigation)
	$effect(() => {
		// Reset state
		results = [];
		nextCursor = null;
		totalCount = 0;
		incompleteResults = false;
		error = null;
		isLoading = false;

		// Wait for streamed promise
		data.streamed.searchResult.then((res) => {
			if (res.error) {
				error = res.error;
			} else if (res.initialData) {
				results = res.initialData.items || [];
				nextCursor = res.initialData.next_cursor;
				totalCount = res.initialData.total_count;
				incompleteResults = res.initialData.incomplete_results;
			}
		});
	});

	async function loadResults(cursor: string) {
		if (isLoading) return;

		isLoading = true;
		error = null;

		try {
			// Call Supabase Edge Function via SDK (CSR for infinite scroll)
			const { data: responseData, error: invokeError } = await supabase.functions.invoke(
				'search',
				{
					body: {
						query: data.query,
						...(data.filter && { filter: data.filter }),
						cursor,
						limit: 10,
					},
					region: edgeFunctionRegion,
				}
			);

			if (invokeError) {
				if (invokeError instanceof FunctionsHttpError) {
					const errorData = await invokeError.context.json();
					throw new Error(errorData.error || 'Search failed');
				}
				throw new Error(invokeError.message || 'Search failed');
			}

			const searchData = responseData as SearchResponse;

			// Append to existing results
			results = [...results, ...searchData.items];
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
			<SearchBar variant="search" query={data.query} filter={data.filter} />
		</section>

		{#await data.streamed.searchResult}
			<div class="flex items-center justify-center py-16">
				<div class="flex items-center gap-2 text-text-muted">
					<div class="h-5 w-5 animate-spin rounded-full border-2 border-accent-blue border-t-transparent"></div>
					<span class="font-mono text-sm">Searching...</span>
				</div>
			</div>
		{:then}
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
				{#each results as result (result.html_url)}
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
			</div>
		{/if}

		<!-- Initial Loading State (only for CSR re-fetches, SSR handles initial) -->
		{#if isLoading && results.length === 0}
			<div class="flex items-center justify-center py-16">
				<div class="flex items-center gap-2 text-text-muted">
					<div class="h-5 w-5 animate-spin rounded-full border-2 border-accent-blue border-t-transparent"></div>
					<span class="font-mono text-sm">Searching...</span>
				</div>
			</div>
		{/if}
		{/await}
	</main>
</div>
