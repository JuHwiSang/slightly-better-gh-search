<script lang="ts">
	import IconLucideFolderOpen from '~icons/lucide/folder-open';
	import type { SearchResultItem, TextMatch } from '$lib/types/search';

	interface Props {
		result: SearchResultItem;
		textMatch?: TextMatch;
	}

	let { result, textMatch }: Props = $props();

	// Compute display values from repository info
	const language = $derived(result.repository.language || 'Unknown');
	const stars = $derived(result.repository.stargazers_count || 0);
	const languageColor = $derived(getLanguageColor(language));
	const updatedAt = $derived(formatDate(result.repository.updated_at));

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

	/**
	 * Extract code snippet from text matches or use default
	 */
	function getCodeSnippet(): string[] {
		// Use the specific textMatch if provided, otherwise fall back to first match
		const match = textMatch ?? result.text_matches?.find((tm) => tm.fragment);

		if (!match?.fragment) {
			return ['// No preview available'];
		}

		// Split fragment into lines
		return match.fragment.split('\n').slice(0, 5); // Show max 5 lines
	}

	const codeLines = $derived(getCodeSnippet());

	/**
	 * Apply text-match highlighting to a code line
	 * Returns HTML string with highlighted terms wrapped in <mark> tags
	 */
	function highlightLine(line: string, lineIndex: number): string {
		// Use the specific textMatch if provided, otherwise fall back to first content match
		const activeMatch = textMatch ?? result.text_matches?.find((tm) => tm.property === 'content');
		if (!activeMatch || activeMatch.property !== 'content') return escapeHtml(line);

		// Find text matches for this line
		const lineStart = codeLines.slice(0, lineIndex).join('\n').length + (lineIndex > 0 ? 1 : 0);
		const lineEnd = lineStart + line.length;

		// Collect all matches that overlap with this line
		const highlights: Array<{ start: number; end: number; text: string }> = [];

		for (const match of activeMatch.matches) {
			const [matchStart, matchEnd] = match.indices;
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
			<IconLucideFolderOpen class="h-[18px] w-[18px]" />
			<a
				href={result.repository.html_url}
				target="_blank"
				rel="noopener noreferrer"
				class="text-base font-semibold text-accent-blue hover:underline"
			>
				{result.repository.full_name}
			</a>
		</div>
		<span class="text-slate-600">/</span>
		<a
			href={result.html_url}
			target="_blank"
			rel="noopener noreferrer"
			class="truncate font-mono text-xs text-text-muted hover:text-accent-blue hover:underline"
		>
			{result.path}
		</a>
	</div>

	<!-- Code Snippet -->
	<div
		class="custom-scrollbar overflow-hidden overflow-x-auto rounded-md border border-terminal-border bg-code-bg font-mono text-xs leading-relaxed sm:text-sm"
	>
		<div class="flex flex-col px-4 py-2 whitespace-pre text-slate-300">
			{#each codeLines as line, index}
				<div>{@html highlightLine(line, index)}</div>
			{/each}
		</div>
	</div>

	<!-- Metadata -->
	<div class="mt-1 flex items-center gap-4 font-mono text-xs text-text-muted">
		<div class="flex items-center gap-1.5">
			<span class="size-2 rounded-full" style="background-color: {languageColor}"></span>
			<span>{language}</span>
		</div>
		<span>{stars.toLocaleString()} stars</span>
		<span>{updatedAt}</span>
	</div>
</article>

