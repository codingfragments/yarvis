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
	daily_dir: string;
	daily_src_dir: string;
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

// ── Dashboard types ──────────────────────────────────────────────────────────

export type Urgency = 'critical' | 'high' | 'medium' | 'low';
export type EventType = 'external' | 'internal' | 'personal_block' | 'personal' | 'declined';
export type ActivityLevel = 'high' | 'medium' | 'low' | 'quiet';

export interface DailyBriefing {
	meta: BriefingMeta;
	greeting: Greeting | null;
	meeting_preps: MeetingPrep[];
	calendar: Calendar | null;
	email: EmailSection | null;
	slack: SlackSection | null;
	intelligence: IntelCategory[];
	action_items: ActionItem[];
	focus_prompt: string | null;
	fun: Fun | null;
}

export interface BriefingMeta {
	briefing_date: string;
	generated_at: string;
	timezone: string | null;
	update_sequence: number | null;
	last_successful_run: string | null;
	run_type: string | null;
	next_meeting: NextMeeting | null;
}

export interface NextMeeting {
	title: string;
	starts_at: string;
	minutes_away: number;
}

export interface Greeting {
	text: string;
	context_note: string | null;
}

export interface MeetingPrep {
	time: string;
	title: string;
	file: string | null;
	deal_tag: string | null;
}

export interface Calendar {
	summary: string | null;
	events: CalendarEvent[];
	conflicts: Conflict[];
}

export interface CalendarEvent {
	start: string;
	end: string;
	title: string;
	participants: string[];
	type: EventType;
	is_external: boolean;
	urgency: Urgency;
	deal_tag: string | null;
	initiative: string | null;
	links: EventLinks | null;
	notes: string | null;
}

export interface EventLinks {
	doc: string | null;
	zoom: string | null;
	other: string | null;
}

export interface Conflict {
	time: string;
	event_titles: string[];
	description: string;
	action_needed: string | null;
}

export interface EmailSection {
	act_today: EmailItem[];
	fyi: EmailItem[];
	no_action_summary: string | null;
}

export interface EmailItem {
	id: string;
	from: string;
	subject: string;
	received: string;
	url: string | null;
	summary: string;
	action: string | null;
	context: string | null;
	urgency: Urgency;
	deal_tag: string | null;
	initiative: string | null;
	tags: string[];
}

export interface SlackSection {
	since: string | null;
	channels: SlackChannel[];
	dms: SlackDm[];
}

export interface SlackChannel {
	channel_id: string;
	channel_name: string;
	url: string | null;
	deal_tag: string | null;
	activity_level: ActivityLevel;
	messages: SlackMessage[];
}

export interface SlackMessage {
	author: string | null;
	timestamp: string | null;
	summary: string;
	links: NamedLink[];
	action: string | null;
}

export interface NamedLink {
	label: string;
	url: string;
}

export interface SlackDm {
	with: string;
	url: string | null;
	summary: string;
	action: string | null;
}

export interface IntelCategory {
	category_id: string;
	items: IntelItem[];
}

export interface IntelItem {
	headline: string;
	detail: string;
	date: string | null;
	source: string | null;
	url: string | null;
	tags: string[];
	relevance: string | null;
}

export interface ActionItem {
	id: string;
	text: string;
	priority: Urgency;
	deadline: string | null;
	source_type: string | null;
	source_ref: string | null;
	url: string | null;
	deal_tag: string | null;
	done: boolean;
}

export interface Fun {
	fact: string | null;
	joke: string | null;
}

export interface BriefingConfig {
	user: UserProfile | null;
	intelligence_categories: IntelligenceCategoryDef[];
	active_deals: ActiveDealDef[];
}

export interface UserProfile {
	name: string | null;
	role: string | null;
	timezone: string | null;
}

export interface IntelligenceCategoryDef {
	id: string;
	label: string;
	icon: string;
	order: number | null;
}

export interface ActiveDealDef {
	id: string;
	name: string;
	stage: string | null;
	color: string | null;
}

export interface DailyStatus {
	exists: boolean;
	briefing_date: string | null;
	generated_at: string | null;
	pending_questions: number;
}

export interface DashboardQuestion {
	index: number;
	status: string;
	title: string;
	asked: string | null;
	run: string | null;
	context: string | null;
	body: string;
	answer: string | null;
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
