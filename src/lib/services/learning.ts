import { invoke } from './tauri';
import type { CourseSummary, LearningCourse, LearningProgress } from '$lib/types';

export async function scanLearningCourses(dir: string): Promise<CourseSummary[]> {
	return invoke<CourseSummary[]>('scan_learning_courses', { dir });
}

export async function getLearningCourse(dir: string, filename: string): Promise<LearningCourse> {
	return invoke<LearningCourse>('get_learning_course', { dir, filename });
}

export async function getLearningProgress(): Promise<LearningProgress> {
	return invoke<LearningProgress>('get_learning_progress');
}

export async function saveLearningProgress(progress: LearningProgress): Promise<void> {
	return invoke<void>('save_learning_progress', { progress });
}

export async function resetLearningProgress(courseId?: string): Promise<void> {
	return invoke<void>('reset_learning_progress', { courseId: courseId ?? null });
}
