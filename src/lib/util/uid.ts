let counter = 0;

export function uid(prefix = 'id'): string {
	counter += 1;
	return `${prefix}-${counter}`;
}
