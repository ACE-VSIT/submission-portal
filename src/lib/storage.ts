import { supabase } from "./supabase";
import { supabaseUrl } from "./config";

export interface PdfUploadResult {
    path: string;
    url: string;
}

/**
 * Storage layer abstraction ("Student UI → Submission API → Storage Service →
 * Hugging Face", design.md §24). React components never talk to Hugging Face
 * directly and no credentials ever reach the browser — the upload is proxied
 * through the server-side Supabase Edge Function which holds HF_TOKEN/HF_REPO_ID.
 */
export interface StorageService {
    uploadPdf(file: File, taskId: string): Promise<PdfUploadResult>;
}

class HuggingFaceStorageService implements StorageService {
    async uploadPdf(file: File, taskId: string): Promise<PdfUploadResult> {
        const form = new FormData();
        form.append("file", file);
        form.append("task_id", taskId);
        const { data, error } = await supabase.functions.invoke("upload-pdf", { body: form });
        if (error) {
            const message = (error as { message?: string }).message ?? "Upload failed";
            throw new Error(message);
        }
        return data as PdfUploadResult;
    }
}

/** XHR variant with real upload progress events. */
export function uploadPdfWithProgress(
    file: File,
    taskId: string,
    onProgress: (percent: number) => void
): Promise<PdfUploadResult> {
    return new Promise((resolve, reject) => {
        (async () => {
            try {
                const { data } = await supabase.auth.getSession();
                const token = data.session?.access_token;
                if (!token) {
                    reject(new Error("Your session expired. Please sign in again."));
                    return;
                }

                const form = new FormData();
                form.append("file", file);
                form.append("task_id", taskId);

                const xhr = new XMLHttpRequest();
                xhr.open("POST", `${supabaseUrl}/functions/v1/upload-pdf`);
                xhr.setRequestHeader("Authorization", `Bearer ${token}`);

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            resolve(JSON.parse(xhr.responseText) as PdfUploadResult);
                        } catch {
                            reject(new Error("Unexpected response from the upload service."));
                        }
                    } else {
                        let message = "Upload failed.";
                        try {
                            const body = JSON.parse(xhr.responseText) as { error?: string };
                            if (body.error) message = body.error;
                        } catch {
                            /* ignore */
                        }
                        reject(new Error(message));
                    }
                };

                xhr.onerror = () => reject(new Error("Network error while uploading. Check your connection."));
                xhr.send(form);
            } catch (err) {
                reject(err instanceof Error ? err : new Error("Upload failed."));
            }
        })();
    });
}

export const storageService: StorageService = new HuggingFaceStorageService();
