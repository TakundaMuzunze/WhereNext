import { ChevronDown, X } from "lucide-react";
import { interestGroups } from "./interestGroups";

type DiscoveryInterestsProps = {
  selectedInterests: string[];
  onToggle: (interest: string) => void;
};

const maximumInterests = 10;

export function DiscoveryInterests({ selectedInterests, onToggle }: DiscoveryInterestsProps) {
  const hasReachedLimit = selectedInterests.length >= maximumInterests;

  return (
    <fieldset className="rounded-2xl border border-border p-5 sm:p-7">
      <legend className="px-2 text-xl font-medium">What would you like to do?</legend>
      <p className="text-sm leading-6 text-muted">
        Browse the groups and mix interests freely. Each has equal importance. Some interests do not yet have verified evidence.
      </p>

      <div className="mt-5 rounded-xl bg-secondary p-4">
        <p role="status" className="text-sm font-medium">
          {selectedInterests.length} of {maximumInterests} selected
        </p>
        {selectedInterests.length === 0 && <p className="mt-2 text-sm text-muted">Choose at least one interest to get started.</p>}
        {selectedInterests.length > 0 && (
          <ul aria-label="Selected interests" className="mt-3 flex flex-wrap gap-2">
            {selectedInterests.map((interest) => (
              <li key={interest} className="max-w-full min-w-0">
                <button
                  type="button"
                  aria-label={`Remove ${interest}`}
                  onClick={() => onToggle(interest)}
                  className="inline-flex min-h-11 max-w-full cursor-pointer items-center gap-2 rounded-full border border-primary/30 bg-surface px-3 py-2 text-left text-sm text-text hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span className="min-w-0 wrap-break-word">{interest}</span>
                  <X aria-hidden="true" className="size-4 shrink-0 text-primary" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {hasReachedLimit && <p className="mt-3 text-sm text-muted">You’ve selected 10 interests. Remove one to choose another.</p>}
      </div>

      <div className="mt-5 space-y-3">
        {interestGroups.map((group, index) => {
          const selectedCount = group.interests.filter((interest) => selectedInterests.includes(interest)).length;

          return (
            <details key={group.name} open={index === 0} className="group overflow-hidden rounded-xl border border-border">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 p-4 marker:content-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1 font-medium">{group.name}</span>
                <span className="shrink-0 rounded-full bg-secondary px-2 py-1 text-xs text-muted">{selectedCount} selected</span>
                <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-primary transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t border-border px-4 pt-3 pb-4">
                <p className="mb-3 text-sm leading-6 text-muted">{group.description}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.interests.map((interest) => {
                    const isSelected = selectedInterests.includes(interest);
                    const isDisabled = hasReachedLimit && !isSelected;
                    let labelClassName =
                      "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm hover:border-primary";

                    if (isSelected) {
                      labelClassName =
                        "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-primary/40 bg-secondary px-3 py-2 text-sm";
                    }

                    if (isDisabled) {
                      labelClassName =
                        "flex min-h-11 cursor-not-allowed items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm opacity-50";
                    }

                    return (
                      <label key={interest} className={labelClassName}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={isDisabled}
                          onChange={() => onToggle(interest)}
                          className="size-4 shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed"
                        />
                        {interest}
                      </label>
                    );
                  })}
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </fieldset>
  );
}
