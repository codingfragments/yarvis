import * as learningService from '$lib/services/learning';
import { isTauri } from '$lib/services/tauri';
import type {
	CourseSummary,
	LearningCourse,
	LearningProgress,
	LearningSession,
	CourseProgress,
	XpRank
} from '$lib/types';

let courses = $state<CourseSummary[]>([]);
let currentCourse = $state<LearningCourse | null>(null);
let progress = $state<LearningProgress>({ courses: {} });
let currentSessionNumber = $state<number>(0);
let loading = $state(false);
let error = $state<string | null>(null);

const PHASE_BONUS_XP = 200;

export function getLearningStore() {
	return {
		get courses() {
			return courses;
		},
		get currentCourse() {
			return currentCourse;
		},
		get progress() {
			return progress;
		},
		get currentSessionNumber() {
			return currentSessionNumber;
		},
		get loading() {
			return loading;
		},
		get error() {
			return error;
		},

		get currentSession(): LearningSession | null {
			if (!currentCourse) return null;
			if (currentSessionNumber === 0) return currentCourse.session_zero;
			for (const phase of currentCourse.phases) {
				const session = phase.sessions.find((s) => s.number === currentSessionNumber);
				if (session) return session;
			}
			return null;
		},

		get courseProgress(): CourseProgress | null {
			if (!currentCourse) return null;
			return progress.courses[currentCourse.id] ?? null;
		},

		get totalXpEarned(): number {
			if (!currentCourse) return 0;
			const cp = progress.courses[currentCourse.id];
			if (!cp) return 0;
			let xp = Object.values(cp.sessions_completed).reduce(
				(sum, sp) => sum + sp.xp_earned,
				0
			);
			// Add phase bonuses
			xp += (cp.phases_completed?.length ?? 0) * PHASE_BONUS_XP;
			return xp;
		},

		get currentRank(): XpRank | null {
			if (!currentCourse || currentCourse.xp_ranks.length === 0) return null;
			const xp = this.totalXpEarned;
			const sorted = [...currentCourse.xp_ranks].sort((a, b) => b.threshold - a.threshold);
			return sorted.find((r) => xp >= r.threshold) ?? currentCourse.xp_ranks[0];
		},

		get nextRank(): XpRank | null {
			if (!currentCourse || currentCourse.xp_ranks.length === 0) return null;
			const xp = this.totalXpEarned;
			const sorted = [...currentCourse.xp_ranks].sort((a, b) => a.threshold - b.threshold);
			return sorted.find((r) => r.threshold > xp) ?? null;
		},

		get allSessions(): LearningSession[] {
			if (!currentCourse) return [];
			const sessions: LearningSession[] = [];
			if (currentCourse.session_zero) sessions.push(currentCourse.session_zero);
			for (const phase of currentCourse.phases) {
				sessions.push(...phase.sessions);
			}
			return sessions;
		},

		get firstIncompleteSession(): number {
			if (!currentCourse) return 0;
			const cp = progress.courses[currentCourse.id];
			if (!cp) return currentCourse.session_zero ? 0 : 1;
			for (const phase of currentCourse.phases) {
				for (const session of phase.sessions) {
					const sp = cp.sessions_completed[String(session.number)];
					if (!sp?.completed) return session.number;
				}
			}
			return currentCourse.session_zero ? 0 : 1;
		},

		async loadCourses(dir: string) {
			if (!isTauri()) {
				error = 'Learning requires Tauri — use "bun run tauri:dev"';
				return;
			}
			loading = true;
			error = null;
			try {
				[courses, progress] = await Promise.all([
					learningService.scanLearningCourses(dir),
					learningService.getLearningProgress()
				]);
			} catch (e) {
				error = String(e);
			} finally {
				loading = false;
			}
		},

		async selectCourse(dir: string, filename: string) {
			loading = true;
			error = null;
			try {
				[currentCourse, progress] = await Promise.all([
					learningService.getLearningCourse(dir, filename),
					learningService.getLearningProgress()
				]);
				// Auto-continue to first incomplete session
				currentSessionNumber = this.firstIncompleteSession;
			} catch (e) {
				error = String(e);
			} finally {
				loading = false;
			}
		},

		selectSession(sessionNumber: number) {
			currentSessionNumber = sessionNumber;
		},

		isSessionCompleted(sessionNumber: number): boolean {
			if (!currentCourse) return false;
			const cp = progress.courses[currentCourse.id];
			return cp?.sessions_completed[String(sessionNumber)]?.completed ?? false;
		},

		isExerciseCompleted(sessionNumber: number, exerciseIndex: number): boolean {
			if (!currentCourse) return false;
			const cp = progress.courses[currentCourse.id];
			const sp = cp?.sessions_completed[String(sessionNumber)];
			return sp?.exercises_completed?.includes(exerciseIndex) ?? false;
		},

		isBossCompleted(sessionNumber: number): boolean {
			if (!currentCourse) return false;
			const cp = progress.courses[currentCourse.id];
			return cp?.sessions_completed[String(sessionNumber)]?.boss_completed ?? false;
		},

		sessionXpEarned(sessionNumber: number): number {
			if (!currentCourse) return 0;
			const cp = progress.courses[currentCourse.id];
			return cp?.sessions_completed[String(sessionNumber)]?.xp_earned ?? 0;
		},

		async toggleExercise(sessionNumber: number, exerciseIndex: number, xp: number) {
			if (!currentCourse) return;
			const courseId = currentCourse.id;
			ensureCourseProgress(courseId);
			ensureSessionProgress(courseId, sessionNumber);

			const sp = progress.courses[courseId].sessions_completed[String(sessionNumber)];
			const idx = sp.exercises_completed.indexOf(exerciseIndex);
			let xpDelta: number;

			if (idx >= 0) {
				sp.exercises_completed.splice(idx, 1);
				xpDelta = -xp;
			} else {
				sp.exercises_completed.push(exerciseIndex);
				xpDelta = xp;
			}
			sp.xp_earned = Math.max(0, sp.xp_earned + xpDelta);
			progress.courses[courseId].last_accessed = new Date().toISOString();

			// Trigger reactivity
			progress = { ...progress };

			try {
				await learningService.saveLearningProgress(progress);
			} catch (e) {
				error = String(e);
			}

			return xpDelta;
		},

		async toggleBoss(sessionNumber: number, xp: number) {
			if (!currentCourse) return;
			const courseId = currentCourse.id;
			ensureCourseProgress(courseId);
			ensureSessionProgress(courseId, sessionNumber);

			const sp = progress.courses[courseId].sessions_completed[String(sessionNumber)];
			let xpDelta: number;

			if (sp.boss_completed) {
				sp.boss_completed = false;
				xpDelta = -xp;
			} else {
				sp.boss_completed = true;
				xpDelta = xp;
			}
			sp.xp_earned = Math.max(0, sp.xp_earned + xpDelta);
			progress.courses[courseId].last_accessed = new Date().toISOString();

			progress = { ...progress };

			try {
				await learningService.saveLearningProgress(progress);
			} catch (e) {
				error = String(e);
			}

			return xpDelta;
		},

		async markSessionComplete(sessionNumber: number) {
			if (!currentCourse) return;
			const courseId = currentCourse.id;
			ensureCourseProgress(courseId);
			ensureSessionProgress(courseId, sessionNumber);

			const sp = progress.courses[courseId].sessions_completed[String(sessionNumber)];
			sp.completed = !sp.completed;
			progress.courses[courseId].last_accessed = new Date().toISOString();

			// Check phase bonus
			this.checkPhaseBonuses();

			progress = { ...progress };

			try {
				await learningService.saveLearningProgress(progress);
			} catch (e) {
				error = String(e);
			}
		},

		checkPhaseBonuses() {
			if (!currentCourse) return;
			const courseId = currentCourse.id;
			const cp = progress.courses[courseId];
			if (!cp) return;

			for (const phase of currentCourse.phases) {
				const allComplete = phase.sessions.every(
					(s) => cp.sessions_completed[String(s.number)]?.completed
				);
				const alreadyAwarded = cp.phases_completed?.includes(phase.number);

				if (allComplete && !alreadyAwarded) {
					if (!cp.phases_completed) cp.phases_completed = [];
					cp.phases_completed.push(phase.number);
				} else if (!allComplete && alreadyAwarded) {
					cp.phases_completed = cp.phases_completed.filter((n) => n !== phase.number);
				}
			}
		},

		async resetCourse(courseId: string) {
			try {
				await learningService.resetLearningProgress(courseId);
				delete progress.courses[courseId];
				progress = { ...progress };
			} catch (e) {
				error = String(e);
			}
		},

		async resetAll() {
			try {
				await learningService.resetLearningProgress();
				progress = { courses: {} };
			} catch (e) {
				error = String(e);
			}
		},

		clearCourse() {
			currentCourse = null;
			currentSessionNumber = 0;
		}
	};
}

function ensureCourseProgress(courseId: string) {
	if (!progress.courses[courseId]) {
		progress.courses[courseId] = {
			course_id: courseId,
			sessions_completed: {},
			phases_completed: [],
			last_accessed: new Date().toISOString()
		};
	}
}

function ensureSessionProgress(courseId: string, sessionNumber: number) {
	const cp = progress.courses[courseId];
	if (!cp.sessions_completed[String(sessionNumber)]) {
		cp.sessions_completed[String(sessionNumber)] = {
			completed: false,
			exercises_completed: [],
			boss_completed: false,
			xp_earned: 0
		};
	}
}
