<script lang="ts">
	import IconLucideLoader2 from '~icons/lucide/loader-2';

	interface Props {
		onLoadMore: () => void;
		hasMore: boolean;
		isLoading: boolean;
		error?: string | null;
	}

	let { onLoadMore, hasMore, isLoading, error = null }: Props = $props();

	let sentinel: HTMLDivElement | null = $state(null);
	let observer: IntersectionObserver | null = null;

	// Setup Intersection Observer
	$effect(() => {
		if (!sentinel || !hasMore || isLoading) {
			return;
		}

		observer = new IntersectionObserver(
			(entries) => {
				const entry = entries[0];
				if (entry.isIntersecting && hasMore && !isLoading) {
					onLoadMore();
				}
			},
			{
				rootMargin: '100px' // Trigger 100px before reaching the sentinel
			}
		);

		observer.observe(sentinel);

		return () => {
			if (observer) {
				observer.disconnect();
			}
		};
	});
</script>

<!-- Sentinel element for intersection observer -->
<div bind:this={sentinel} class="infinite-scroll-sentinel">
	{#if isLoading}
		<div class="flex items-center justify-center gap-2 py-8 text-text-muted">
			<IconLucideLoader2 class="h-5 w-5 animate-spin" />
			<span class="font-mono text-sm">Loading more results...</span>
		</div>
	{:else if error}
		<div class="flex flex-col items-center gap-3 py-8">
			<p class="font-mono text-sm text-red-400">{error}</p>
			<button
				onclick={() => onLoadMore()}
				class="rounded border border-terminal-border bg-terminal-panel px-4 py-2 font-mono text-sm text-text-muted transition-colors hover:bg-[#21262d]"
			>
				Retry
			</button>
		</div>
	{:else if !hasMore}
		<div class="flex items-center justify-center py-8">
			<span class="font-mono text-sm text-text-muted">No more results</span>
		</div>
	{/if}
</div>

<style>
	.infinite-scroll-sentinel {
		min-height: 1px; /* Ensure sentinel is visible to observer */
	}
</style>
