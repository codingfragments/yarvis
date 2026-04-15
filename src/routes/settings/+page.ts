import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	// Settings are loaded reactively via the store in +layout.svelte.
	// This load function exists to demonstrate the SvelteKit pattern:
	// in a full implementation, you'd call the service layer here.
	return {};
};
