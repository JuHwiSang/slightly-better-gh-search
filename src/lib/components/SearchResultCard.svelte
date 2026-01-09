<script lang="ts">
	import IconLucideFolderOpen from '~icons/lucide/folder-open';

	interface SearchResult {
		repository: string;
		filePath: string;
		language: string;
		languageColor: string;
		stars: number;
		updatedAt: string;
		codeSnippet: {
			startLine: number;
			lines: string[];
		};
	}

	interface Props {
		result: SearchResult;
	}

	let { result }: Props = $props();
</script>

<article class="flex flex-col gap-2">
	<!-- Repository and File Path -->
	<div class="flex items-center gap-2 text-sm">
		<div class="flex items-center gap-2 text-text-muted">
			<IconLucideFolderOpen class="h-[18px] w-[18px]" />
			<a
				href={`https://github.com/${result.repository}`}
				target="_blank"
				rel="noopener noreferrer"
				class="text-base font-semibold text-accent-blue hover:underline"
			>
				{result.repository}
			</a>
		</div>
		<span class="text-slate-600">/</span>
		<span class="truncate font-mono text-xs text-text-muted">{result.filePath}</span>
	</div>

	<!-- Code Snippet -->
	<div
		class="custom-scrollbar overflow-hidden overflow-x-auto rounded-md border border-terminal-border bg-code-bg font-mono text-xs leading-relaxed sm:text-sm"
	>
		<div class="flex py-2">
			<!-- Line Numbers -->
			<div class="flex flex-col border-r border-terminal-border bg-code-bg select-none">
				{#each result.codeSnippet.lines as _, index}
					<span class="line-number">{result.codeSnippet.startLine + index}</span>
				{/each}
			</div>

			<!-- Code Lines -->
			<div class="flex flex-col px-4 whitespace-pre text-slate-300">
				{#each result.codeSnippet.lines as line}
					<div>{line}</div>
				{/each}
			</div>
		</div>
	</div>

	<!-- Metadata -->
	<div class="mt-1 flex items-center gap-4 font-mono text-xs text-text-muted">
		<div class="flex items-center gap-1.5">
			<span class="size-2 rounded-full" style="background-color: {result.languageColor}"></span>
			<span>{result.language}</span>
		</div>
		<span>{result.stars.toLocaleString()} stars</span>
		<span>{result.updatedAt}</span>
	</div>
</article>
