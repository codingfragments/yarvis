<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    icon?: string;
    title: string;
    subtitle?: string | null;
    count?: number | null;
    collapsible?: boolean;
    defaultOpen?: boolean;
    fillHeight?: boolean;
    onToggle?: (open: boolean) => void;
    children: Snippet;
    actions?: Snippet;
  }

  let {
    icon,
    title,
    subtitle = null,
    count = null,
    collapsible = false,
    defaultOpen = true,
    fillHeight = false,
    onToggle,
    children,
    actions,
  }: Props = $props();

  // eslint-disable-next-line svelte/no-state-referenced-locally
  // svelte-ignore state_referenced_locally
  let open = $state(defaultOpen);

  function toggle() {
    open = !open;
    onToggle?.(open);
  }
</script>

<section
  class="rounded-xl bg-base-200/40 border border-base-content/5 overflow-hidden flex flex-col {fillHeight
    ? 'h-full min-h-0'
    : ''}"
>
  <header
    class="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-base-content/5"
  >
    {#if icon}<span class="text-lg leading-none">{icon}</span>{/if}
    <div class="flex-1 min-w-0">
      <h2 class="text-sm font-semibold text-base-content truncate">
        {title}
        {#if count !== null && count !== undefined}
          <span class="ml-1.5 text-xs font-mono text-base-content/40"
            >{count}</span
          >
        {/if}
      </h2>
      {#if subtitle}
        <p class="text-xs text-base-content/50 mt-0.5 truncate">{subtitle}</p>
      {/if}
    </div>
    {#if actions}
      {@render actions()}
    {/if}
    {#if collapsible}
      <button
        class="btn btn-ghost btn-sm h-8 min-h-8 w-8 px-0 text-lg leading-none"
        onclick={toggle}
        aria-expanded={open}
        aria-label={open ? "Collapse section" : "Expand section"}
        title={open ? "Collapse" : "Expand"}
      >
        <span class="inline-block transition-transform" class:rotate-90={open}
          >▶</span
        >
      </button>
    {/if}
  </header>
  {#if open}
    <div class="px-3 py-4 {fillHeight ? 'flex-1 min-h-0 overflow-y-auto' : ''}">
      {@render children()}
    </div>
  {/if}
</section>
