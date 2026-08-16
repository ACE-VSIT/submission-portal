import * as React from "react";
import { Plus, X, Link2, Globe, Github, Figma, ExternalLink } from "lucide-react";
import { isValidHttpUrl } from "@/lib/utils";
import { MAX_LINKS } from "@/lib/config";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LinkInputProps {
    links: string[];
    onChange: (links: string[]) => void;
    disabled?: boolean;
}

function iconForLink(url: string) {
    if (!url) return <Link2 className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />;
    const host = url.toLowerCase();
    if (host.includes("github.com"))
        return <Github className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />;
    if (host.includes("figma.com"))
        return <Figma className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />;
    return <Globe className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />;
}

export function LinkInput({ links, onChange, disabled }: LinkInputProps) {
    const [draft, setDraft] = React.useState("");
    const [error, setError] = React.useState<string | null>(null);
    const draftRef = React.useRef<HTMLInputElement>(null);

    const addLink = () => {
        const value = draft.trim();
        if (!value) return;
        if (!isValidHttpUrl(value)) {
            setError("Enter a full URL starting with http:// or https://");
            return;
        }
        if (links.length >= MAX_LINKS) {
            setError(`You can add up to ${MAX_LINKS} links.`);
            return;
        }
        onChange([...links, value]);
        setDraft("");
        setError(null);
        requestAnimationFrame(() => draftRef.current?.focus());
    };

    return (
        <div className="space-y-2">
            {links.length > 0 && (
                <ul className="space-y-2" aria-label="Added links">
                    {links.map((link, i) => (
                        <li
                            key={`${link}-${i}`}
                            className="border-border bg-muted/30 flex items-center gap-2.5 rounded-sm border px-3 py-2"
                        >
                            {iconForLink(link)}
                            <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-electric focus-visible:ring-electric min-w-0 flex-1 truncate text-sm underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:outline-none"
                            >
                                {link}
                            </a>
                            <ExternalLink className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
                            <button
                                type="button"
                                onClick={() => onChange(links.filter((_, j) => j !== i))}
                                disabled={disabled}
                                className="text-muted-foreground hover:bg-error/10 hover:text-error focus-visible:ring-error rounded-sm p-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                                aria-label={`Remove link ${i + 1}`}
                            >
                                <X className="size-4" aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">
                        {iconForLink(draft)}
                    </span>
                    <Input
                        ref={draftRef}
                        value={draft}
                        onChange={(e) => {
                            setDraft(e.target.value);
                            setError(null);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                addLink();
                            }
                        }}
                        placeholder="https://github.com/you/project"
                        type="url"
                        className="pl-9"
                        disabled={disabled || links.length >= MAX_LINKS}
                        aria-label="Add a link"
                    />
                </div>
                <Button
                    type="button"
                    variant="secondary"
                    onClick={addLink}
                    disabled={disabled || links.length >= MAX_LINKS || !draft.trim()}
                >
                    <Plus className="size-4" aria-hidden="true" />
                    Add
                </Button>
            </div>

            {error && (
                <p className="text-error text-sm" role="alert">
                    {error}
                </p>
            )}
            <p className="text-muted-foreground font-mono text-[0.625rem] tracking-[0.05em] uppercase">
                {links.length}/{MAX_LINKS} links · GitHub, Figma, live sites, demos, documents
            </p>
        </div>
    );
}
