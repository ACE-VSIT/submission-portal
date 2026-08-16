import { Badge } from "@/components/ui/badge";
import { DIFFICULTY_META, difficultyLabel } from "@/lib/difficulty";
import type { Difficulty } from "@/lib/types";

/**
 * Difficulty is communicated through a distinct visual treatment per level —
 * never violet (reserved for workflow/info), using the semantic state tier
 * plus neutral — always paired with the text label, never color alone.
 */
export function DifficultyBadge({ difficulty, className }: { difficulty: Difficulty; className?: string }) {
  const meta = DIFFICULTY_META[difficulty];
  return (
    <Badge
      variant={
        difficulty === "easy"
          ? "success"
          : difficulty === "medium"
            ? "warning"
            : difficulty === "hard"
              ? "error"
              : "primary"
      }
      title={meta.hint}
      className={className}
    >
      {difficultyLabel(difficulty)}
    </Badge>
  );
}
