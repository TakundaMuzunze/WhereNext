import type { TripType } from "@/entities/trip/model/types";
import { tripTypes } from "@/shared/data/TripTypes";

type TripTypeStepProps = {
  selectedTripType: TripType | "";
  onSelect: (tripType: TripType) => void;
};

export function TripTypeStep({ selectedTripType, onSelect }: TripTypeStepProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {tripTypes.map((tripType) => {
        const isSelected = selectedTripType === tripType.value;

        return (
          <button
            key={tripType.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect(tripType.value)}
            className={`rounded-2xl border p-5 text-left transition ${
              isSelected
                ? "border-primary bg-primary text-white dark:text-[#101214]"
                : "border-primary/20 bg-background text-text hover:border-primary"
            }`}
          >
            <h2 className="text-lg font-semibold">{tripType.label}</h2>
            <p className={`mt-2 text-sm ${isSelected ? "opacity-80" : "text-text/70"}`}>{tripType.description}</p>
          </button>
        );
      })}
    </div>
  );
}
