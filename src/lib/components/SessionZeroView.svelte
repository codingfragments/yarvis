<script lang="ts">
	import type { LearningSession } from '$lib/types';
	import MarkdownRenderer from './MarkdownRenderer.svelte';

	interface Props {
		session: LearningSession;
	}

	let { session }: Props = $props();
</script>

<div class="flex flex-col gap-6">
	<!-- Header -->
	<div class="flex flex-col gap-2">
		<h1 class="text-lg font-bold text-base-content">
			🎬 Session 0 — {session.title}
		</h1>
		<div class="rounded-lg bg-info/10 border border-info/20 px-3 py-2 text-xs text-info">
			Prerequisites & context — no XP tracking for this session.
		</div>
	</div>

	<!-- Content rendered as markdown -->
	<div>
		<MarkdownRenderer markdown={session.raw_markdown} />
	</div>
</div>
