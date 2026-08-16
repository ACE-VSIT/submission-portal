import type { Difficulty, SubmissionType } from "./types";

export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard", "extreme"];

export const DIFFICULTY_META: Record<Difficulty, { label: string; rank: number; hint: string }> = {
    easy: { label: "Easy", rank: 1, hint: "Foundational — warm-up problem" },
    medium: { label: "Medium", rank: 2, hint: "Core skill — expected solve" },
    hard: { label: "Hard", rank: 3, hint: "Advanced — pushes your limits" },
    extreme: { label: "Extreme", rank: 4, hint: "Boss level — only for the bold" },
};

export function difficultyLabel(d: Difficulty): string {
    return DIFFICULTY_META[d].label;
}

export const SUBMISSION_TYPE_META: Record<SubmissionType, { label: string; short: string }> = {
    pdf: { label: "PDF upload", short: "PDF" },
    link: { label: "Link(s)", short: "LINKS" },
    pdf_link: { label: "PDF + Link(s)", short: "PDF + LINKS" },
};
