<script lang="ts">
	import IconLucideFolderOpen from '~icons/lucide/folder-open';

	interface TextMatch {
		object_url: string;
		object_type: string;
		property: string;
		fragment: string;
		matches: Array<{
			text: string;
			indices: [number, number];
		}>;
	}

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
		text_matches?: TextMatch[];
	}

	interface Props {
		result: SearchResult;
	}

	let { result }: Props = $props();

	/**
	 * Apply text-match highlighting to a code line
	 * Returns HTML string with highlighted terms wrapped in <mark> tags
	 */
	function highlightLine(line: string, lineIndex: number): string {
		if (!result.text_matches) return line;

		// Find text matches for this line
		const lineStart = result.codeSnippet.lines.slice(0, lineIndex).join('\n').length + lineIndex;
		const lineEnd = lineStart + line.length;

		// Collect all matches that overlap with this line
		const highlights: Array<{ start: number; end: number; text: string }> = [];

		for (const textMatch of result.text_matches) {
			// Only process matches for file content
			if (textMatch.property !== 'body' && textMatch.property !== 'path') continue;

			for (const match of textMatch.matches) {
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
		}

		// If no highlights, return original line
		if (highlights.length === 0) return line;

		// Sort highlights by start position
		highlights.sort((a, b) => a.start - b.start);

		// Build highlighted string
		let result_html = '';
		let lastIndex = 0;

		for (const highlight of highlights) {
			// Add text before highlight
			result_html += line.slice(lastIndex, highlight.start);
			// Add highlighted text
			result_html += `<mark class="bg-yellow-400/30 text-yellow-200">${line.slice(highlight.start, highlight.end)}</mark>`;
			lastIndex = highlight.end;
		}

		// Add remaining text
		result_html += line.slice(lastIndex);

		return result_html;
	}
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
				{#each result.codeSnippet.lines as line, index}
					<div>{@html highlightLine(line, index)}</div>
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
