<script lang="ts">
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabase';
	import { FunctionsHttpError } from '@supabase/supabase-js';
	import IconLucideLogOut from '~icons/lucide/log-out';
	import IconLucideUserMinus from '~icons/lucide/user-minus';
	import IconLucideArrowLeft from '~icons/lucide/arrow-left';
	import IconLucideAlertTriangle from '~icons/lucide/alert-triangle';
	import ProfileCard from '$lib/components/ProfileCard.svelte';
	import UsageCard from '$lib/components/UsageCard.svelte';
	import { authState } from '$lib/stores/auth.svelte';

	let deleteDialog: HTMLDialogElement | undefined;
	let isDeleting = $state(false);
	let deleteError = $state<string | null>(null);

	function openDeleteDialog() {
		deleteError = null;
		deleteDialog?.showModal();
	}

	function closeDeleteDialog() {
		if (isDeleting) return;
		deleteDialog?.close();
	}

	async function handleLogout() {
		await authState.signOut();
		goto('/');
	}

	async function handleDeleteAccount() {
		isDeleting = true;
		deleteError = null;

		try {
			const { error } = await supabase.functions.invoke('delete-account', {
				method: 'POST'
			});

			if (error) {
				let message = 'Failed to delete account. Please try again.';
				if (error instanceof FunctionsHttpError) {
					try {
						const body = await error.context.json();
						message = body.error || message;
					} catch {
						// non-JSON body
					}
					console.error(
						`[Profile] Delete account error`,
						`\n  Status: ${error.context.status}`,
						`\n  Detail:`,
						error
					);
				} else {
					console.error(`[Profile] Unexpected error during account deletion:`, error);
				}
				deleteError = message;
				return;
			}

			// Success: sign out and redirect
			await authState.signOut();
			goto('/');
		} finally {
			isDeleting = false;
		}
	}
</script>

<div class="font-display flex min-h-screen flex-col items-center bg-background-dark">
	<div class="flex w-full max-w-[640px] flex-col gap-8 px-4 py-8 md:py-12">
		<!-- Header with Back Button -->
		<header class="flex flex-col gap-2">
			<div class="mb-2">
				<button
					onclick={() => window.history.back()}
					class="inline-flex items-center gap-2 text-text-muted transition-colors hover:text-white"
				>
					<IconLucideArrowLeft class="h-5 w-5" />
					<span class="text-sm font-medium">Back</span>
				</button>
			</div>
			<h1 class="text-3xl font-bold tracking-tight text-white">Profile Settings</h1>
			<p class="text-base text-text-muted">
				Manage your GitHub repository connections and account status.
			</p>
		</header>

		<!-- Profile Card -->
		<ProfileCard
			name={authState.user?.name!}
			email={authState.user?.email!}
			avatarUrl={authState.user?.avatar_url!}
			isGitHubConnected={authState.isAuthenticated}
		/>

		<!-- Usage Card -->
		<UsageCard />

		<!-- Action Buttons -->
		<section class="flex flex-col gap-4">
			<button
				onclick={handleLogout}
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
					onclick={openDeleteDialog}
					class="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-red-600 bg-red-600/10 font-bold text-red-500 transition-all hover:border-red-500 hover:bg-red-600/20 hover:text-red-400"
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

	<!-- Delete Confirmation Dialog -->
	<dialog
		bind:this={deleteDialog}
		class="rounded-xl border border-slate-700 bg-[#1a2230] p-0 backdrop:bg-black/50"
	>
		<div class="flex w-[400px] max-w-[90vw] flex-col gap-6 p-6">
			<!-- Header -->
			<div class="flex items-start gap-4">
				<div class="rounded-full bg-red-500/10 p-3">
					<IconLucideAlertTriangle class="h-6 w-6 text-red-500" />
				</div>
				<div class="flex-1">
					<h3 class="text-xl font-bold text-white">Delete Account</h3>
					<p class="mt-2 text-sm leading-relaxed text-text-muted">
						Are you sure you want to delete your account? This action cannot be undone and will
						permanently remove all your data, including saved repository settings and API keys.
					</p>
				</div>
			</div>

			<!-- Error message -->
			{#if deleteError}
				<p class="rounded-lg border border-red-800 bg-red-900/20 px-3 py-2 text-sm text-red-400">
					{deleteError}
				</p>
			{/if}

			<!-- Actions -->
			<div class="flex gap-3">
				<button
					onclick={closeDeleteDialog}
					disabled={isDeleting}
					class="{isDeleting ? 'cursor-not-allowed opacity-50' : 'hover:bg-[#2a3855]'} flex h-11 flex-1 items-center justify-center rounded-lg border border-slate-700 bg-[#232f48] font-medium text-white transition-colors"
				>
					Cancel
				</button>
				<button
					onclick={handleDeleteAccount}
					disabled={isDeleting}
					class="{isDeleting ? 'cursor-not-allowed opacity-70' : 'hover:border-red-500 hover:bg-red-500'} flex h-11 flex-1 items-center justify-center rounded-lg border-2 border-red-600 bg-red-600 font-bold text-white transition-all"
				>
					{isDeleting ? 'Deleting...' : 'Delete Account'}
				</button>
			</div>
		</div>
	</dialog>
</div>
