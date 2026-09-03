type ActivitiesStepProps = {
  availableActivities: string[];
  selectedActivities: string[];
  onToggle: (activity: string) => void;
};

export function ActivitiesStep({ availableActivities, selectedActivities, onToggle }: ActivitiesStepProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-text">What do you want to do?</h2>

      <p className="mt-2 text-text/70">Choose the activities that matter most for this trip.</p>

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
                isSelected ? "border-primary bg-primary text-white dark:text-[#101214]" : "border-primary/20 text-text hover:border-primary"
              }`}
            >
              {activity}
            </button>
          );
        })}
      </div>

      {availableActivities.length === 0 && <p className="mt-6 rounded-xl bg-secondary p-4 text-text">Go back and choose a trip type first.</p>}
    </div>
  );
}
