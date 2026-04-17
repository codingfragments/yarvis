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
	learning_dir: string;
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

export interface TodayWidgets {
	focus: string | null;
	fun_fact: string | null;
	date_display: string;
}

export interface SystemInfo {
	app_version: string;
	os: string;
	arch: string;
	rust_version: string;
}

export type PomodoroPhase = 'idle' | 'focus' | 'shortBreak' | 'longBreak';

export interface PomodoroSettings {
	focusMinutes: number;
	shortBreakMinutes: number;
	longBreakMinutes: number;
	sessionsBeforeLongBreak: number;
	autoStartBreaks: boolean;
	autoStartFocus: boolean;
}

// ── Learning types ───────────────────────────────────────────────────────────

export interface CourseSummary {
	id: string;
	filename: string;
	title: string;
	emoji: string;
	subtitle: string;
	session_count: number;
	total_xp: number;
}

export interface LearningCourse {
	id: string;
	filename: string;
	title: string;
	emoji: string;
	subtitle: string;
	session_count: number;
	total_xp: number;
	time_metadata: string;
	about_markdown: string;
	xp_ranks: XpRank[];
	session_zero: LearningSession | null;
	phases: LearningPhase[];
	appendix_markdown: string;
}

export interface LearningPhase {
	number: number;
	name: string;
	emoji: string;
	intro_markdown: string;
	sessions: LearningSession[];
}

export interface LearningSession {
	number: number;
	title: string;
	goal: string;
	time: string;
	level: string;
	xp_available: XpBreakdown | null;
	prerequisites: string;
	theory_markdown: string;
	warmup_markdown: string;
	exercises: LearningExercise[];
	boss_challenge: BossChallenge | null;
	summary_points: string[];
	resources_markdown: string;
	is_session_zero: boolean;
	raw_markdown: string;
}

export interface LearningExercise {
	index: number;
	title: string;
	description_markdown: string;
	xp: number;
}

export interface BossChallenge {
	title: string;
	description_markdown: string;
	xp: number;
}

export interface XpBreakdown {
	exercises: number;
	boss: number;
	total: number;
}

export interface XpRank {
	threshold: number;
	emoji: string;
	name: string;
	meaning: string;
}

export interface LearningProgress {
	courses: Record<string, CourseProgress>;
}

export interface CourseProgress {
	course_id: string;
	sessions_completed: Record<string, SessionProgress>;
	phases_completed: number[];
	last_accessed: string;
}

export interface SessionProgress {
	completed: boolean;
	exercises_completed: number[];
	boss_completed: boolean;
	xp_earned: number;
}

// ── App types ────────────────────────────────────────────────────────────────

export interface AppTileConfig {
	id: string;
	label: string;
	icon: string;
	href: string;
	accent: string;
	available: boolean;
	description: string;
}
