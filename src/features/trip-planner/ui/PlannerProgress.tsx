type PlannerProgressProps = {
  currentStep: number;
  totalSteps: number;
};

export function PlannerProgress({ currentStep, totalSteps }: PlannerProgressProps) {
  return (
    <div className="flex w-full gap-2 sm:w-56" aria-label={`Step ${currentStep} of ${totalSteps}`}>
      {Array.from({ length: totalSteps }, (_, index) => (
        <span key={index} className={`h-1 flex-1 rounded-full transition-colors ${index < currentStep ? "bg-primary" : "bg-primary/15"}`} />
      ))}
    </div>
  );
}
