<script lang="ts">
	import IconLucideChevronLeft from '~icons/lucide/chevron-left';
	import IconLucideChevronRight from '~icons/lucide/chevron-right';

	interface Props {
		currentPage?: number;
		totalPages?: number;
	}

	let { currentPage = 1, totalPages = 10 }: Props = $props();

	function getPageNumbers() {
		const pages: (number | string)[] = [];

		if (totalPages <= 7) {
			// Show all pages if 7 or fewer
			for (let i = 1; i <= totalPages; i++) {
				pages.push(i);
			}
		} else {
			// Always show first page
			pages.push(1);

			if (currentPage > 3) {
				pages.push('...');
			}

			// Show pages around current page
			for (
				let i = Math.max(2, currentPage - 1);
				i <= Math.min(totalPages - 1, currentPage + 1);
				i++
			) {
				pages.push(i);
			}

			if (currentPage < totalPages - 2) {
				pages.push('...');
			}

			// Always show last page
			pages.push(totalPages);
		}

		return pages;
	}
</script>

<nav
	aria-label="Pagination"
	class="flex items-center gap-1 rounded-lg border border-terminal-border bg-terminal-panel p-1"
>
	<!-- Previous Button -->
	<a
		href={currentPage > 1 ? `/search?page=${currentPage - 1}` : '#'}
		class="rounded p-2 {currentPage > 1
			? 'text-text-muted hover:bg-[#21262d]'
			: 'cursor-not-allowed text-gray-700'}"
		aria-disabled={currentPage === 1}
	>
		<IconLucideChevronLeft class="h-4 w-4" />
	</a>

	<!-- Page Numbers -->
	{#each getPageNumbers() as page}
		{#if page === '...'}
			<span class="px-2 text-xs text-text-muted">...</span>
		{:else}
			<a
				href={`/search?page=${page}`}
				class="rounded px-3 py-1 text-xs font-medium transition-colors {page === currentPage
					? 'bg-accent-blue text-white'
					: 'text-slate-300 hover:bg-[#21262d]'}"
			>
				{page}
			</a>
		{/if}
	{/each}

	<!-- Next Button -->
	<a
		href={currentPage < totalPages ? `/search?page=${currentPage + 1}` : '#'}
		class="rounded p-2 {currentPage < totalPages
			? 'text-text-muted hover:bg-[#21262d]'
			: 'cursor-not-allowed text-gray-700'}"
		aria-disabled={currentPage === totalPages}
	>
		<IconLucideChevronRight class="h-4 w-4" />
	</a>
</nav>
