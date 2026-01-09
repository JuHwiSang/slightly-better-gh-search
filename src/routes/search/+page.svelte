<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
	import SearchResultCard from '$lib/components/SearchResultCard.svelte';
	import Pagination from '$lib/components/Pagination.svelte';

	// Mock data for demonstration
	const mockResults = [
		{
			repository: 'remix-run/react-router',
			filePath: 'packages/react-router/lib/router.ts',
			language: 'TypeScript',
			languageColor: '#3178c6',
			stars: 51200,
			updatedAt: '2h ago',
			codeSnippet: {
				startLine: 142,
				lines: [
					'export function matchRoutes(',
					'  routes: RouteObject[],',
					'  locationArg: Partial<Location> | string,',
					'  basename?: string',
					'): RouteMatch[] | null { ... }'
				]
			}
		},
		{
			repository: 'facebook/react',
			filePath: 'packages/react-dom/src/server/ReactDOMLegacyServerBrowser.js',
			language: 'JavaScript',
			languageColor: '#f1e05a',
			stars: 213000,
			updatedAt: '1d ago',
			codeSnippet: {
				startLine: 65,
				lines: [
					'function renderToNodeStream() {',
					'  throw new Error(',
					"    'ReactDOMServer.renderToNodeStream(): The streaming API is not available ' +",
					"    'in the browser env.'"
				]
			}
		},
		{
			repository: 'vercel/next.js',
			filePath: 'packages/next/src/client/components/router-reducer/router-reducer-types.ts',
			language: 'TypeScript',
			languageColor: '#3178c6',
			stars: 114000,
			updatedAt: '3d ago',
			codeSnippet: {
				startLine: 22,
				lines: [
					'export type ReadonlyURLSearchParams = URLSearchParams & {',
					'  append: never',
					'  delete: never',
					'  set: never'
				]
			}
		}
	];
</script>

<div class="flex min-h-screen flex-col">
	<Header />

	<main class="mx-auto flex w-full max-w-[1024px] flex-1 flex-col gap-6 px-4 py-8">
		<!-- Search Bar Section -->
		<section class="flex flex-col gap-4">
			<SearchBar variant="search" />
		</section>

		<!-- Results Count -->
		<div class="mt-2 flex items-center justify-between border-b border-terminal-border pb-2">
			<h2 class="font-mono text-sm text-text-muted">Showing 2,341 results</h2>
		</div>

		<!-- Results List -->
		<div class="flex flex-col gap-8">
			{#each mockResults as result}
				<SearchResultCard {result} />
			{/each}
		</div>

		<!-- Pagination -->
		<div class="mt-8 flex justify-center pb-10">
			<Pagination currentPage={1} totalPages={10} />
		</div>
	</main>
</div>
