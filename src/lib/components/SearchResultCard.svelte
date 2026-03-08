<script lang="ts">
	import { slide } from 'svelte/transition';
	import IconLucideFileCode from '~icons/lucide/file-code';
	import IconLucideInfo from '~icons/lucide/info';
	import IconLucideGitFork from '~icons/lucide/git-fork';
	import IconLucideCircleDot from '~icons/lucide/circle-dot';
	import type { SearchResultItem } from '$lib/types/search';

	interface Props {
		result: SearchResultItem;
	}

	let { result }: Props = $props();

	let isRepoInfoOpen = $state(false);

	// Compute display values from repository info
	const language = $derived(result.repository.language || 'Unknown');
	const stars = $derived(result.repository.stargazers_count || 0);
	const languageColor = $derived(getLanguageColor(language));
	const updatedAt = $derived(formatDate(result.repository.updated_at));
	const topicsString = $derived(result.repository.topics?.length ? `[${result.repository.topics.map(t => `"${t}"`).join(', ')}]` : '[]');

	/**
	 * Get color for programming language
	 */
	function getLanguageColor(lang: string): string {
		const colors: Record<string, string> = {
			TypeScript: '#3178c6',
			JavaScript: '#f1e05a',
			Python: '#3572A5',
			Java: '#b07219',
			Go: '#00ADD8',
			Rust: '#dea584',
			Ruby: '#701516',
			PHP: '#4F5D95',
			'C++': '#f34b7d',
			C: '#555555',
			'C#': '#178600',
			Swift: '#ffac45',
			Kotlin: '#A97BFF',
			Dart: '#00B4AB',
			HTML: '#e34c26',
			CSS: '#563d7c',
			Vue: '#41b883',
			Svelte: '#ff3e00'
		};
		return colors[lang] || '#8b949e';
	}

	/**
	 * Format ISO date to relative time
	 */
	function formatDate(isoDate: string): string {
		const date = new Date(isoDate);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const hours = Math.floor(diff / (1000 * 60 * 60));
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));

		if (hours < 24) return `${hours}h ago`;
		if (days < 30) return `${days}d ago`;
		return date.toLocaleDateString();
	}

	const SEPARATOR = '\u2026'; // '…' ellipsis as separator marker

	/**
	 * Build code lines from all content text_matches, joined by '...' separator
	 */
	function getCodeSnippet(): string[] {
		const contentMatches = result.text_matches?.filter((tm) => tm.fragment) ?? [];

		if (contentMatches.length === 0) {
			return ['// No preview available'];
		}

		const lines: string[] = [];
		for (let i = 0; i < contentMatches.length; i++) {
			if (i > 0) {
				lines.push(SEPARATOR);
			}
			lines.push(...contentMatches[i].fragment.split('\n').slice(0, 5));
		}
		return lines;
	}

	/**
	 * Map each code line back to its source TextMatch (for highlighting).
	 * Separator lines map to null.
	 */
	function buildLineMatchMap(): (number | null)[] {
		const contentMatches = result.text_matches?.filter((tm) => tm.fragment) ?? [];
		if (contentMatches.length === 0) return [];

		const map: (number | null)[] = [];
		for (let i = 0; i < contentMatches.length; i++) {
			if (i > 0) map.push(null); // separator
			const fragLines = contentMatches[i].fragment.split('\n').slice(0, 5);
			for (let _j = 0; _j < fragLines.length; _j++) {
				map.push(i);
			}
		}
		return map;
	}

	const codeLines = $derived(getCodeSnippet());
	const lineMatchMap = $derived(buildLineMatchMap());

	/**
	 * Apply text-match highlighting to a code line
	 * Returns HTML string with highlighted terms wrapped in <mark> tags
	 */
	function highlightLine(line: string, lineIndex: number): string {
		const matchIdx = lineMatchMap[lineIndex];
		if (matchIdx === null || matchIdx === undefined) return escapeHtml(line);

		const contentMatches = result.text_matches?.filter((tm) => tm.fragment) ?? [];
		const activeMatch = contentMatches[matchIdx];
		if (!activeMatch || activeMatch.property !== 'content') return escapeHtml(line);

		// Compute line offset within this match's fragment
		// We need to find this line's position relative to the fragment start
		const fragLines = activeMatch.fragment.split('\n').slice(0, 5);
		// Find which fragment line this corresponds to
		let fragLineIdx = 0;
		let count = 0;
		for (let i = 0; i < lineIndex; i++) {
			if (lineMatchMap[i] === matchIdx) count++;
		}
		fragLineIdx = count;

		const lineStart = fragLines.slice(0, fragLineIdx).join('\n').length + (fragLineIdx > 0 ? 1 : 0);
		const lineEnd = lineStart + line.length;

		// Collect all matches that overlap with this line
		const highlights: Array<{ start: number; end: number; text: string }> = [];

		for (const match of activeMatch.matches) {
			// GitHub API returns indices as UTF-8 byte offsets; convert to char offsets
			const matchStart = utf8ByteToCharOffset(activeMatch.fragment, match.indices[0]);
			const matchEnd = utf8ByteToCharOffset(activeMatch.fragment, match.indices[1]);
			// Check if match overlaps with current line
			if (matchStart < lineEnd && matchEnd > lineStart) {
				highlights.push({
					start: Math.max(0, matchStart - lineStart),
					end: Math.min(line.length, matchEnd - lineStart),
					text: match.text
				});
			}
		}

		// If no highlights, return escaped line
		if (highlights.length === 0) return escapeHtml(line);

		// Sort highlights by start position
		highlights.sort((a, b) => a.start - b.start);

		// Build highlighted string
		let result_html = '';
		let lastIndex = 0;

		for (const highlight of highlights) {
			// Add text before highlight (escaped)
			result_html += escapeHtml(line.slice(lastIndex, highlight.start));
			// Add highlighted text (escaped)
			result_html += `<mark class="bg-yellow-400/30 text-yellow-200">${escapeHtml(line.slice(highlight.start, highlight.end))}</mark>`;
			lastIndex = highlight.end;
		}

		// Add remaining text (escaped)
		result_html += escapeHtml(line.slice(lastIndex));

		return result_html;
	}

	/**
	 * Convert UTF-8 byte offset to JS character offset.
	 * GitHub API returns indices as UTF-8 byte offsets,
	 * but JS strings use UTF-16 character indexing.
	 */
	function utf8ByteToCharOffset(str: string, byteOffset: number): number {
		const encoded = new TextEncoder().encode(str);
		const decoded = new TextDecoder().decode(encoded.slice(0, byteOffset));
		return decoded.length;
	}

	/**
	 * Escape HTML to prevent XSS
	 */
	function escapeHtml(text: string): string {
		const map: Record<string, string> = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#039;'
		};
		return text.replace(/[&<>"']/g, (m) => map[m]);
	}
</script>

<article class="flex flex-col gap-2">
	<!-- Repository and File Path -->
	<div class="flex items-center gap-2 text-sm">
		<div class="flex items-center gap-2 text-text-muted">
			<IconLucideFileCode class="h-[18px] w-[18px] shrink-0" />
			<a
				href={result.repository.html_url}
				target="_blank"
				rel="noopener noreferrer"
				class="text-base font-semibold text-accent-blue hover:underline"
			>
				{result.repository.full_name}
			</a>
		</div>
		<a
			href={result.html_url}
			target="_blank"
			rel="noopener noreferrer"
			class="truncate font-mono text-xs text-text-muted hover:text-accent-blue hover:underline"
		>
			<span class="">/</span>{result.path}
		</a>
	</div>

	<!-- Code Snippet -->
	<div
		class="overflow-hidden overflow-x-auto rounded-md border border-terminal-border bg-code-bg font-mono text-xs leading-relaxed sm:text-sm"
	>
		<div class="flex flex-col px-4 py-2 whitespace-pre text-slate-300">
			{#each codeLines as line, index}
				{#if line === SEPARATOR}
					<div class="my-1 border-t border-dashed border-terminal-border text-center text-xs text-text-muted">...</div>
				{:else}
					<div>{@html highlightLine(line, index)}</div>
				{/if}
			{/each}
		</div>
	</div>

	<!-- Metadata -->
	<div class="mt-1 flex items-center justify-between font-mono text-xs text-text-muted">
		<div class="flex items-center gap-4">
			<div class="flex items-center gap-1.5">
				<span class="size-2 rounded-full" style="background-color: {languageColor}"></span>
				<span>{language}</span>
			</div>
			<span>{stars.toLocaleString()} stars</span>
			<span>{updatedAt}</span>
		</div>
		<button
			class="flex items-center gap-1 outline-none transition-colors hover:text-accent-blue focus-visible:text-accent-blue {isRepoInfoOpen ? 'text-accent-blue' : ''}"
			onclick={() => (isRepoInfoOpen = !isRepoInfoOpen)}
			aria-expanded={isRepoInfoOpen}
			aria-label="Toggle repository data for filtering"
		>
			<IconLucideInfo class="size-3.5" />
			<span>Repo Data</span>
		</button>
	</div>

	<!-- Expanded Repo Data (Filter Helper) -->
	{#if isRepoInfoOpen}
		<div
			transition:slide={{ duration: 200 }}
			class="mt-2 text-[11px] sm:text-xs rounded-md border border-terminal-border bg-code-bg/60 p-3 shadow-sm font-mono overflow-x-auto"
		>
			<div class="mb-3 text-text-muted flex items-center justify-between border-b border-terminal-border/50 pb-2">
				<span class="font-semibold text-text-body">Available Filter Properties</span>
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1.5">
				<!-- Numbers -->
				<div class="flex items-start gap-2"><span class="text-accent-blue/90 w-24 shrink-0">stars</span><span class="text-yellow-200/90 break-all">: {result.repository.stargazers_count}</span></div>
				<div class="flex items-start gap-2"><span class="text-accent-blue/90 w-24 shrink-0">watchers</span><span class="text-yellow-200/90 break-all">: {result.repository.watchers_count}</span></div>
				<div class="flex items-start gap-2"><span class="text-accent-blue/90 w-24 shrink-0">forks</span><span class="text-yellow-200/90 break-all">: {result.repository.forks_count}</span></div>
				<div class="flex items-start gap-2"><span class="text-accent-blue/90 w-24 shrink-0">issues</span><span class="text-yellow-200/90 break-all">: {result.repository.open_issues_count}</span></div>
				
				<!-- Booleans -->
				<div class="flex items-start gap-2"><span class="text-accent-blue/90 w-24 shrink-0">is_fork</span><span class="text-purple-400/90 break-all">: {result.repository.fork}</span></div>
				<div class="flex items-start gap-2"><span class="text-accent-blue/90 w-24 shrink-0">is_private</span><span class="text-purple-400/90 break-all">: {result.repository.private}</span></div>
				
				<!-- Strings -->
				<div class="flex items-start gap-2"><span class="text-accent-blue/90 w-24 shrink-0">language</span><span class="text-green-400/90 break-all">: "{result.repository.language || ''}"</span></div>
				<div class="flex items-start gap-2"><span class="text-accent-blue/90 w-24 shrink-0">name</span><span class="text-green-400/90 break-all">: "{result.repository.name}"</span></div>
				<div class="flex items-start gap-2"><span class="text-accent-blue/90 w-24 shrink-0">owner</span><span class="text-green-400/90 break-all">: "{result.repository.owner.login}"</span></div>
				<div class="flex items-start gap-2"><span class="text-accent-blue/90 w-24 shrink-0">owner_type</span><span class="text-green-400/90 break-all">: "{result.repository.owner.type}"</span></div>
				<div class="flex items-start gap-2"><span class="text-accent-blue/90 w-24 shrink-0">visibility</span><span class="text-green-400/90 break-all">: "{result.repository.visibility}"</span></div>

				<!-- Arrays & Long Strings -->
				<div class="flex items-start gap-2 sm:col-span-2 lg:col-span-3">
					<span class="text-accent-blue/90 w-24 shrink-0">full_name</span>
					<span class="text-green-400/90 break-all">: "{result.repository.full_name}"</span>
				</div>
				<div class="flex items-start gap-2 sm:col-span-2 lg:col-span-3">
					<span class="text-accent-blue/90 w-24 shrink-0">default_branch</span>
					<span class="text-green-400/90 break-all">: "{result.repository.default_branch}"</span>
				</div>
				<div class="flex items-start gap-2 sm:col-span-2 lg:col-span-3">
					<span class="text-accent-blue/90 w-24 shrink-0">topics</span>
					<span class="text-slate-300 break-all">: {topicsString}</span>
				</div>
                
				<div class="flex items-start gap-2 sm:col-span-2 lg:col-span-3">
					<span class="text-accent-blue/90 w-24 shrink-0">description</span>
					<span class="text-green-400/90 break-all">: "{result.repository.description || ''}"</span>
				</div>
			</div>
		</div>
	{/if}
</article>

