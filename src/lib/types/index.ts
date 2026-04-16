export interface Settings {
	theme: 'dark' | 'light' | 'auto';
	accent_color: string;
	data_directory: string;
	pixel_font_headings: boolean;
	window_opacity: number;
	launch_at_startup: boolean;
	python_path: string;
	briefings_dir: string;
	briefings_max_days: number;
}

export interface DateEntry {
	key: string;
	display: string;
	is_today: boolean;
	file_count: number;
}

export interface FileEntry {
	filename: string;
	label: string;
	icon: string;
	time: string | null;
	is_morning: boolean;
	unchecked_count: number;
}

export interface Heading {
	text: string;
	id: string;
	level: number;
}

export interface SystemInfo {
	app_version: string;
	os: string;
	arch: string;
	rust_version: string;
}

export interface AppTileConfig {
	id: string;
	label: string;
	icon: string;
	href: string;
	accent: string;
	available: boolean;
	description: string;
}
