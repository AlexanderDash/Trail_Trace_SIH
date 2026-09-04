import { Construction } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { PageHeader } from "./PageHeader";
import { Panel } from "./Panel";
import { Badge } from "./Badge";

export function ModulePlaceholder({
  title,
  description,
  planned,
}: {
  title: string;
  description: string;
  planned: string[];
}) {
  return (
    <div>
      <PageHeader
        eyebrow="Foundation placeholder"
        title={title}
        description={description}
        actions={<Badge tone="warning">Not implemented</Badge>}
      />
      <Panel>
        <EmptyState
          icon={Construction}
          title="This workspace is scaffolded, not simulated"
          body="The route, navigation, and API module exist. No demo data is being invented to look like a finished capability."
        />
        <div className="border-t border-ink-200 pt-4 dark:border-ink-800">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-ink-400">Planned for later stages</p>
          <ul className="grid gap-2 text-sm text-ink-600 dark:text-ink-300 md:grid-cols-2">
            {planned.map((item) => (
              <li key={item} className="rounded-lg bg-ink-50 px-3 py-2 dark:bg-ink-800/60">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </Panel>
    </div>
  );
}
