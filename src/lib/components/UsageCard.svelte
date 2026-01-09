<script lang="ts">
	import IconLucideBarChart2 from '~icons/lucide/bar-chart-2';
	import IconLucideInfo from '~icons/lucide/info';

	interface Props {
		used?: number;
		total?: number;
	}

	let { used = 750, total = 1000 }: Props = $props();

	const percentage = $derived(Math.round((used / total) * 100));
</script>

<section class="rounded-xl border border-border-dark bg-card-dark p-6 shadow-sm md:p-8">
	<div class="mb-6 flex items-center gap-2">
		<IconLucideBarChart2 class="h-6 w-6 text-accent-blue" />
		<h3 class="font-display text-lg font-bold text-white">API Usage</h3>
	</div>

	<div class="flex flex-col gap-4">
		<!-- Usage Stats -->
		<div class="flex items-end justify-between">
			<div class="flex flex-col">
				<span class="mb-1 text-sm text-text-muted">Requests this month</span>
				<span class="font-mono text-3xl font-bold tracking-tight text-white">
					{used.toLocaleString()}
					<span class="text-lg font-normal text-slate-600">/ {total.toLocaleString()}</span>
				</span>
			</div>
			<span class="mb-1 rounded bg-accent-blue/10 px-2 py-1 text-sm font-bold text-accent-blue">
				{percentage}% Used
			</span>
		</div>

		<!-- Progress Bar -->
		<div class="h-3 w-full overflow-hidden rounded-full bg-slate-700">
			<div
				class="h-full rounded-full bg-accent-blue transition-all duration-500 ease-out"
				style="width: {percentage}%;"
			></div>
		</div>

		<!-- Info Message -->
		<div class="mt-1 flex items-start gap-2">
			<IconLucideInfo class="mt-0.5 h-4 w-4 text-text-muted" />
			<p class="text-sm leading-snug text-text-muted">
				API usage resets automatically on the 1st of each month. Additional charges may apply if
				limits are exceeded.
			</p>
		</div>
	</div>
</section>
