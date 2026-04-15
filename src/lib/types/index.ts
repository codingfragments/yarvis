export interface Settings {
	theme: 'dark' | 'light' | 'auto';
	accent_color: string;
	data_directory: string;
	pixel_font_headings: boolean;
	window_opacity: number;
	launch_at_startup: boolean;
	python_path: string;
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
