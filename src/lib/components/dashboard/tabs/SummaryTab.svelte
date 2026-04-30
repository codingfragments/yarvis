<script lang="ts">
	import type { DailyBriefing, DashboardQuestion } from '$lib/types';
	import SectionCard from '../SectionCard.svelte';
	import Chip from '../Chip.svelte';
	import Callout from '../Callout.svelte';
	import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';
	import { questionTone } from '$lib/dashboard/format';

	interface Props {
		briefing: DailyBriefing;
		questions: DashboardQuestion[];
		pendingCount: number;
		lastLoaded: Date | null;
		onEditQuestion: (q: DashboardQuestion) => void;
	}

	let { briefing, questions, pendingCount, lastLoaded, onEditQuestion }: Props = $props();

	let showOpenQuestionsOnly = $state(true);

	const visibleQuestions = $derived(
		showOpenQuestionsOnly ? questions.filter((q) => q.status === 'PENDING') : questions
	);
</script>

<div class="flex flex-col gap-4">
	{#if briefing.greeting}
		<section class="rounded-xl bg-gradient-to-br from-primary/10 via-base-200/40 to-secondary/10 border border-base-content/5 px-5 py-4">
			<h2 class="text-base font-semibold text-base-content leading-snug">{briefing.greeting.text}</h2>
			{#if briefing.greeting.context_note}
				<p class="mt-1.5 text-xs text-base-content/70 leading-relaxed break-words">
					💡 {briefing.greeting.context_note}
				</p>
			{/if}
		</section>
	{/if}

	{#if briefing.focus_prompt}
		<Callout tone="primary" title="Today's focus">
			<p class="text-xs text-base-content/80 leading-relaxed whitespace-pre-wrap">{briefing.focus_prompt}</p>
		</Callout>
	{/if}

	{#if questions.length > 0}
		<SectionCard
			icon="❓"
			title="Questions"
			subtitle={pendingCount > 0
				? `${pendingCount} pending of ${questions.length}`
				: `All ${questions.length} answered`}
			count={visibleQuestions.length}
			collapsible
		>
			{#snippet actions()}
				<button
					class="btn btn-ghost btn-xs h-7 min-h-7 text-xs gap-1.5 normal-case"
					class:btn-active={showOpenQuestionsOnly}
					onclick={() => (showOpenQuestionsOnly = !showOpenQuestionsOnly)}
					aria-pressed={showOpenQuestionsOnly}
					title="Toggle filter"
				>
					<span
						class="inline-block w-3 h-3 rounded-sm border border-base-content/30 flex items-center justify-center text-xs leading-none"
						class:bg-primary={showOpenQuestionsOnly}
						class:border-primary={showOpenQuestionsOnly}
						class:text-primary-content={showOpenQuestionsOnly}
					>
						{showOpenQuestionsOnly ? '✓' : ''}
					</span>
					Open only
				</button>
			{/snippet}

			{#if visibleQuestions.length === 0}
				<p class="text-xs text-base-content/40 italic">
					{showOpenQuestionsOnly
						? 'No open questions. Toggle the filter to see answered ones.'
						: 'No questions today.'}
				</p>
			{:else}
				<ul class="flex flex-col gap-2.5">
					{#each visibleQuestions as q (q.title)}
						{@const editable = q.status !== 'PROCESSED'}
						<li
							class="group rounded-lg border bg-base-100/40 px-4 py-3 transition-colors"
							class:border-warning={q.status === 'PENDING'}
							class:border-opacity-30={q.status === 'PENDING'}
							class:border-success={q.status === 'ANSWERED'}
							class:border-opacity-25={q.status === 'ANSWERED'}
							class:border-base-content={q.status === 'PROCESSED'}
							class:border-opacity-10={q.status === 'PROCESSED'}
							class:opacity-70={q.status === 'PROCESSED'}
						>
							<div class="flex items-start gap-2 mb-1.5">
								<Chip variant="status" tone={questionTone(q.status)} labelOverride={q.status.toLowerCase()} />
								<h4 class="flex-1 text-sm font-medium text-base-content leading-snug">{q.title}</h4>
								{#if editable}
									<button
										class="shrink-0 btn btn-xs h-7 min-h-7 normal-case text-xs"
										class:btn-primary={q.status === 'PENDING'}
										class:btn-ghost={q.status === 'ANSWERED'}
										onclick={() => onEditQuestion(q)}
									>
										{q.status === 'PENDING' ? 'Answer' : 'Edit'}
									</button>
								{/if}
							</div>

							{#if q.context}
								<p class="text-xs text-base-content/55 italic mb-1.5 leading-snug">{q.context}</p>
							{/if}

							{#if q.body}
								<div class="text-xs text-base-content/75 leading-relaxed">
									<MarkdownRenderer markdown={q.body} />
								</div>
							{/if}

							{#if q.answer}
								<div class="mt-2.5">
									<Callout tone="success" title="Your answer">
										<p class="text-xs text-base-content/85 whitespace-pre-wrap leading-snug">{q.answer}</p>
									</Callout>
								</div>
							{/if}

							{#if q.asked || q.run}
								<div class="flex items-center gap-1.5 text-xs text-base-content/35 font-mono mt-2">
									{#if q.asked}<span>asked {q.asked}</span>{/if}
									{#if q.run}<span>· run {q.run}</span>{/if}
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</SectionCard>
	{/if}

	<footer class="text-xs text-base-content/40 pt-2">
		Generated {briefing.meta.generated_at} · timezone {briefing.meta.timezone ?? '?'}
		· run {briefing.meta.run_type ?? '?'} #{briefing.meta.update_sequence ?? 1}
		{#if lastLoaded}· loaded {lastLoaded.toLocaleTimeString()}{/if}
	</footer>
</div>
