<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import SearchBar from '$lib/components/SearchBar.svelte';
</script>

<div class="flex min-h-screen flex-col">
	<Header />

	<main
		class="relative mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-4 py-12 pb-24 md:px-8"
	>
		<!-- Grid Background Pattern -->
		<div
			class="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-20"
		></div>

		<div class="relative z-10 flex w-full flex-col items-center gap-10">
			<!-- Title Section -->
			<div class="space-y-3 text-center">
				<h1 class="font-display text-4xl font-bold tracking-tight text-white md:text-5xl">
					Slightly <span class="text-accent-blue">Better</span> GH Search
				</h1>
				<p class="text-sm text-text-muted md:text-base">
					Enhanced code search for GitHub with advanced filtering
				</p>
			</div>

			<!-- Search Bar -->
			<div class="w-full max-w-2xl">
				<SearchBar variant="main" />
				<p class="mt-6 text-center font-mono text-xs text-gray-600">
					[TAB] to switch fields • [ENTER] to execute
				</p>
			</div>
		</div>
	</main>
</div>
