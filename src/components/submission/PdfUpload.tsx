import * as React from "react";
import { FileText, X, CheckCircle2, Loader2 } from "lucide-react";
import { cn, formatFileSize, truncateMiddle } from "@/lib/utils";
import { MAX_PDF_SIZE_MB } from "@/lib/config";

interface PdfUploadProps {
  value: File | null;
  onChange: (file: File | null) => void;
  progress: number | null;
  disabled?: boolean;
  error?: string | null;
}

/**
 * PDF selection + validation + progress — never uploads directly from the
 * client; selection only, then the SubmissionPanel drives the proxy upload.
 */
export function PdfUpload({ value, onChange, progress, disabled, error }: PdfUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);

  const validateAndSet = (file: File | undefined | null) => {
    setLocalError(null);
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setLocalError("Only PDF files are accepted.");
      return;
    }
    if (file.size > MAX_PDF_SIZE_MB * 1024 * 1024) {
      setLocalError(`PDF is larger than ${MAX_PDF_SIZE_MB} MB — compress it and try again.`);
      return;
    }
    onChange(file);
  };

  const uploading = progress !== null;

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          validateAndSet(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {!value ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            validateAndSet(e.dataTransfer.files?.[0]);
          }}
          disabled={disabled}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-sm border border-dashed border-border bg-muted/30 px-4 py-10 text-center transition-colors duration-150",
            "hover:border-electric/60 hover:bg-electric/5",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-60",
            dragOver && "border-electric bg-electric/5",
          )}
        >
          <FileText className="size-6 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
          <span className="text-sm font-medium text-foreground">Select a PDF to upload</span>
          <span className="font-mono text-[0.625rem] uppercase tracking-[0.05em] text-muted-foreground">
            Max {MAX_PDF_SIZE_MB} MB · .pdf
          </span>
        </button>
      ) : (
        <div className="flex items-center gap-3 rounded-sm border border-border bg-muted/30 px-4 py-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-electric/10">
            <FileText className="size-4 text-electric" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground" title={value.name}>
              {truncateMiddle(value.name, 52)}
            </p>
            <p className="font-mono text-[0.625rem] uppercase tracking-[0.05em] text-muted-foreground">
              {formatFileSize(value.size)}
            </p>
          </div>
          {uploading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-electric" aria-hidden="true" />
              <span className="font-mono text-xs text-foreground">{progress}%</span>
            </div>
          ) : (
            <>
              <CheckCircle2 className="size-4 text-success" aria-hidden="true" />
              <button
                type="button"
                onClick={() => onChange(null)}
                disabled={disabled}
                className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error"
                aria-label="Remove PDF"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      )}

      {(localError || error) && (
        <p className="mt-2 text-sm text-error" role="alert">
          {localError ?? error}
        </p>
      )}
    </div>
  );
}
