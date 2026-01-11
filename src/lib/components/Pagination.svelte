<script lang="ts">
	import IconLucideChevronLeft from '~icons/lucide/chevron-left';
	import IconLucideChevronRight from '~icons/lucide/chevron-right';
	import IconLucideChevronsLeft from '~icons/lucide/chevrons-left';
	import IconLucideChevronsRight from '~icons/lucide/chevrons-right';

	interface Props {
		currentPage?: number;
		totalPages?: number;
		query?: string;
		filter?: string;
	}

	let { currentPage = 1, totalPages = 10, query = '', filter = '' }: Props = $props();

	function buildPageUrl(page: number): string {
		const params = new URLSearchParams();
		if (query) params.set('query', query);
		if (filter) params.set('filter', filter);
		params.set('page', page.toString());
		return `/search?${params.toString()}`;
	}

	function getPageNumbers() {
		const pages: number[] = [];

		// Always show 5 pages centered around current page
		let startPage = Math.max(1, currentPage - 2);
		let endPage = Math.min(totalPages, startPage + 4);

		// Adjust if we're near the end
		if (endPage - startPage < 4) {
			startPage = Math.max(1, endPage - 4);
		}

		for (let i = startPage; i <= endPage; i++) {
			pages.push(i);
		}

		return pages;
	}
</script>

<nav
	aria-label="Pagination"
	class="flex items-center gap-1 rounded-lg border border-terminal-border bg-terminal-panel p-1"
>
	<!-- First Button (<<) -->
	<a
		href={currentPage > 1 ? buildPageUrl(1) : '#'}
		class="rounded p-2 {currentPage > 1
			? 'text-text-muted hover:bg-[#21262d]'
			: 'pointer-events-none cursor-not-allowed text-gray-700'}"
		aria-disabled={currentPage === 1}
		title="First page"
	>
		<IconLucideChevronsLeft class="h-4 w-4" />
	</a>

	<!-- Previous Button (<) -->
	<a
		href={currentPage > 1 ? buildPageUrl(currentPage - 1) : '#'}
		class="rounded p-2 {currentPage > 1
			? 'text-text-muted hover:bg-[#21262d]'
			: 'pointer-events-none cursor-not-allowed text-gray-700'}"
		aria-disabled={currentPage === 1}
		title="Previous page"
	>
		<IconLucideChevronLeft class="h-4 w-4" />
	</a>

	<!-- Page Numbers (5 pages) -->
	{#each getPageNumbers() as page}
		{#if page === currentPage}
			<span
				class="pointer-events-none cursor-default rounded bg-accent-blue px-3 py-1 text-xs font-medium text-white"
			>
				{page}
			</span>
		{:else}
			<a
				href={buildPageUrl(page)}
				class="rounded px-3 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-[#21262d]"
			>
				{page}
			</a>
		{/if}
	{/each}

	<!-- Next Button (>) -->
	<a
		href={currentPage < totalPages ? buildPageUrl(currentPage + 1) : '#'}
		class="rounded p-2 {currentPage < totalPages
			? 'text-text-muted hover:bg-[#21262d]'
			: 'pointer-events-none cursor-not-allowed text-gray-700'}"
		aria-disabled={currentPage === totalPages}
		title="Next page"
	>
		<IconLucideChevronRight class="h-4 w-4" />
	</a>

	<!-- Last Button (>>) -->
	<a
		href={currentPage < totalPages ? buildPageUrl(totalPages) : '#'}
		class="rounded p-2 {currentPage < totalPages
			? 'text-text-muted hover:bg-[#21262d]'
			: 'pointer-events-none cursor-not-allowed text-gray-700'}"
		aria-disabled={currentPage === totalPages}
		title="Last page"
	>
		<IconLucideChevronsRight class="h-4 w-4" />
	</a>
</nav>
