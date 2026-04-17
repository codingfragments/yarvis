<script lang="ts">
	interface Props {
		xp: number;
		visible: boolean;
	}

	let { xp, visible }: Props = $props();
</script>

{#if visible}
	<span class="xp-popup text-xs font-bold text-warning pointer-events-none select-none">
		+{xp} XP
	</span>
{/if}

<style>
	.xp-popup {
		animation: xp-float 0.8s ease-out forwards;
		position: absolute;
		top: -4px;
		right: -8px;
		z-index: 10;
	}

	@keyframes xp-float {
		0% {
			opacity: 1;
			transform: translateY(0);
		}
		100% {
			opacity: 0;
			transform: translateY(-20px);
		}
	}
</style>
