<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Slightly Better GitHub Search</title>
</svelte:head>

<div class="min-h-screen bg-background-dark font-mono text-white">
	{@render children()}
</div>
