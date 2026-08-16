import { Breadcrumbs, type Crumb } from "./Breadcrumbs";

interface PageHeaderProps {
  crumbs: Crumb[];
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ crumbs, title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <Breadcrumbs items={crumbs} />
        <div className="mt-2.5 flex items-baseline gap-3">
          <h1 className="text-balance font-heading text-2xl font-medium leading-snug tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
        </div>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-pretty text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
