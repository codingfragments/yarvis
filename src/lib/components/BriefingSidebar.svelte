<script lang="ts">
	import type { DateEntry, FileEntry, Heading } from '$lib/types';

	interface Props {
		dates: DateEntry[];
		files: FileEntry[];
		currentDate: string | null;
		currentFile: string | null;
		sidePanelFile?: string | null;
		headings: Heading[];
		searchQuery: string;
		onDateChange: (key: string) => void;
		onFileSelect: (filename: string) => void;
		onSearchChange: (query: string) => void;
	}

	let {
		dates,
		files,
		currentDate,
		currentFile,
		sidePanelFile = null,
		headings,
		searchQuery,
		onDateChange,
		onFileSelect,
		onSearchChange
	}: Props = $props();

	const filteredFiles = $derived(
		searchQuery
			? files.filter(
					(f) =>
						f.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
						f.filename.toLowerCase().includes(searchQuery.toLowerCase())
				)
			: files
	);
</script>

<aside class="w-64 flex-shrink-0 bg-base-200/30 border-r border-base-content/5 flex flex-col h-full overflow-hidden">
	<!-- Header with date selector -->
	<div class="p-3 border-b border-base-content/5 flex-shrink-0">
		<div class="text-[10px] font-semibold uppercase tracking-widest text-base-content/30 mb-2 flex items-center gap-1.5">
			📋 Briefings
		</div>
		{#if dates.length > 0}
			<select
				class="select select-bordered select-sm w-full text-sm"
				value={currentDate}
				onchange={(e) => onDateChange(e.currentTarget.value)}
			>
				{#each dates as date}
					<option value={date.key}>
						{date.display}{date.is_today ? ' — Today' : ''} ({date.file_count})
					</option>
				{/each}
			</select>
		{/if}
	</div>

	<!-- Search -->
	<div class="px-3 pt-2 flex-shrink-0">
		<input
			type="text"
			placeholder="Filter files..."
			class="input input-bordered input-sm w-full text-sm"
			value={searchQuery}
			oninput={(e) => onSearchChange(e.currentTarget.value)}
		/>
	</div>

	<!-- File list -->
	<div class="flex-1 overflow-y-auto px-2 py-2">
		<div class="text-[10px] font-semibold uppercase tracking-wider text-base-content/30 px-2 py-1.5 flex items-center gap-2">
			Files
			<span class="flex-1 h-px bg-base-content/5"></span>
		</div>

		{#each filteredFiles as file}
			<button
				class="flex items-center gap-2 w-full px-2.5 py-2 rounded-md text-left text-sm transition-all mb-0.5
					{currentFile === file.filename
						? 'bg-primary/10 text-primary font-semibold shadow-[inset_3px_0_0] shadow-primary'
						: sidePanelFile === file.filename
							? 'bg-secondary/10 text-secondary font-medium shadow-[inset_3px_0_0] shadow-secondary'
							: 'text-base-content/60 hover:bg-base-content/5 hover:text-base-content'}"
				onclick={() => onFileSelect(file.filename)}
			>
				<span class="flex-shrink-0 text-sm">{file.icon}</span>
				<span class="flex-1 truncate">{file.label}</span>
				{#if file.time}
					<span class="flex-shrink-0 bg-base-content/5 text-base-content/40 text-[10px] font-mono px-1.5 py-0.5 rounded
						{currentFile === file.filename ? 'bg-primary/15 text-primary' : sidePanelFile === file.filename ? 'bg-secondary/15 text-secondary' : ''}">
						{file.time}
					</span>
				{/if}
				{#if file.unchecked_count > 0}
					<span class="flex-shrink-0 bg-warning/15 text-warning text-[10px] font-bold px-1.5 py-0.5 rounded-full">
						{file.unchecked_count}
					</span>
				{/if}
			</button>
		{/each}

		{#if filteredFiles.length === 0}
			<div class="text-xs text-base-content/30 px-2 py-4 text-center">No files found</div>
		{/if}

		<!-- Anchor navigation -->
		{#if headings.length > 1}
			<div class="mt-3">
				<div class="h-px bg-base-content/5 mx-1 mb-2"></div>
				<div class="text-[10px] font-semibold uppercase tracking-wider text-base-content/30 px-2 py-1.5 flex items-center gap-2">
					On this page
					<span class="flex-1 h-px bg-base-content/5"></span>
				</div>
				<div class="ml-3 border-l border-base-content/5 pl-2">
					{#each headings as heading}
						<button
							class="block w-full text-left text-sm py-0.5 px-1.5 rounded text-base-content/40
								hover:text-base-content/70 hover:bg-base-content/5 truncate transition-colors
								{heading.level >= 3 ? 'pl-4 text-xs' : ''}"
							title={heading.text}
							onclick={() => {
								const el = document.getElementById(heading.id);
								if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
							}}
						>
							{heading.text}
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</aside>
