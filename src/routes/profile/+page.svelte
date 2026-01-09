<script lang="ts">
	import IconLucideLogOut from '~icons/lucide/log-out';
	import IconLucideUserMinus from '~icons/lucide/user-minus';
	import ProfileCard from '$lib/components/ProfileCard.svelte';
	import UsageCard from '$lib/components/UsageCard.svelte';
</script>

<div class="font-display flex min-h-screen flex-col items-center bg-background-dark">
	<div class="flex w-full max-w-[640px] flex-col gap-8 px-4 py-8 md:py-12">
		<!-- Header -->
		<header class="flex flex-col gap-2">
			<h1 class="text-3xl font-bold tracking-tight text-white">Profile Settings</h1>
			<p class="text-base text-text-muted">
				Manage your GitHub repository connections and account status.
			</p>
		</header>

		<!-- Profile Card -->
		<ProfileCard />

		<!-- Usage Card -->
		<UsageCard />

		<!-- Action Buttons -->
		<section class="flex flex-col gap-4">
			<button
				class="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-700 bg-[#232f48] font-bold text-white transition-colors hover:bg-[#2a3855]"
			>
				<IconLucideLogOut class="h-5 w-5" />
				<span>Log out</span>
			</button>

			<div class="relative py-2">
				<div aria-hidden="true" class="absolute inset-0 flex items-center">
					<div class="w-full border-t border-slate-800"></div>
				</div>
			</div>

			<div class="flex flex-col gap-3">
				<button
					class="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg font-medium text-red-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
				>
					<IconLucideUserMinus class="h-5 w-5" />
					<span>Delete account</span>
				</button>
				<p class="text-center text-xs text-slate-500">
					Deleting your account will permanently remove all saved repository settings and API keys.
				</p>
			</div>
		</section>
	</div>
</div>
