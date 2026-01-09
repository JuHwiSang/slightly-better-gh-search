<script lang="ts">
	import IconLucidePencil from '~icons/lucide/pencil';
	import IconLucideGitBranch from '~icons/lucide/git-branch';

	interface Props {
		name?: string;
		email?: string;
		avatarUrl?: string;
		isGitHubConnected?: boolean;
	}

	let {
		name = 'Dev User',
		email = 'dev@example.com',
		avatarUrl = 'https://api.dicebear.com/7.x/avataaars/svg?seed=GitScout',
		isGitHubConnected = true
	}: Props = $props();
</script>

<section class="overflow-hidden rounded-xl border border-border-dark bg-card-dark shadow-sm">
	<div class="flex flex-col items-center gap-6 p-6 md:p-8">
		<!-- Profile Picture -->
		<div class="group relative">
			<div
				class="h-32 w-32 rounded-full bg-cover bg-center ring-4 ring-slate-700"
				style="background-image: url('{avatarUrl}');"
			></div>
			<div
				class="absolute right-0 bottom-0 flex cursor-pointer items-center justify-center rounded-full border-4 border-card-dark bg-accent-blue p-2 text-white transition-colors hover:bg-blue-500"
			>
				<IconLucidePencil class="h-4 w-4" />
			</div>
		</div>

		<!-- User Info -->
		<div class="space-y-1 text-center">
			<h2 class="font-display text-2xl font-bold text-white">{name}</h2>
			<p class="font-medium text-text-muted">{email}</p>
			<div class="pt-2">
				<span
					class="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-sm font-medium text-slate-300"
				>
					<IconLucideGitBranch class="h-[18px] w-[18px]" />
					{isGitHubConnected ? 'GitHub Connected' : 'GitHub Disconnected'}
				</span>
			</div>
		</div>
	</div>
</section>
