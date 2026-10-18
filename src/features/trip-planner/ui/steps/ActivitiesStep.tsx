type ActivitiesStepProps = {
  availableActivities: string[];
  selectedActivities: string[];
  onToggle: (activity: string) => void;
  title?: string;
  description?: string;
};

export function ActivitiesStep({
  availableActivities,
  selectedActivities,
  onToggle,
  title = "What do you want to do?",
  description = "Choose the activities that matter most for this trip.",
}: ActivitiesStepProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-text">{title}</h2>

      <p className="mt-2 text-muted">{description}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        {availableActivities.map((activity) => {
          const isSelected = selectedActivities.includes(activity);

          return (
            <button
              key={activity}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onToggle(activity)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                isSelected ? "border-primary bg-primary text-primary-foreground" : "border-border text-text hover:border-primary"
              }`}
            >
              {activity}
            </button>
          );
        })}
      </div>

      {availableActivities.length === 0 && (
        <p className="mt-6 rounded-xl bg-secondary p-4 text-text">Choose a holiday style above to see its activities.</p>
      )}
    </div>
  );
}
