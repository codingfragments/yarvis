<script lang="ts">
	import { isTauri } from '$lib/services/tauri';

	interface Props {
		href: string | null | undefined;
		label?: string;
		icon?: string;
		title?: string;
		variant?: 'pill' | 'inline';
	}

	let {
		href,
		label = '',
		icon = '↗',
		title,
		variant = 'pill'
	}: Props = $props();

	async function open(e: MouseEvent) {
		if (!href) return;
		e.preventDefault();
		if (isTauri()) {
			const { open: shellOpen } = await import('@tauri-apps/plugin-shell');
			await shellOpen(href);
		} else {
			window.open(href, '_blank', 'noopener');
		}
	}
</script>

{#if href}
	{#if variant === 'pill'}
		<a
			class="inline-flex items-center gap-1 rounded-full bg-base-300/50 hover:bg-base-300 transition-colors px-2 py-0.5 text-xs text-base-content/70 hover:text-base-content"
			href={href}
			title={title ?? label}
			onclick={open}
		>
			<span>{icon}</span>
			{#if label}<span>{label}</span>{/if}
		</a>
	{:else}
		<a
			class="text-primary hover:underline inline-flex items-center gap-0.5"
			href={href}
			title={title ?? label}
			onclick={open}
		>
			{#if label}<span>{label}</span>{/if}
			<span class="text-xs opacity-60">{icon}</span>
		</a>
	{/if}
{/if}
