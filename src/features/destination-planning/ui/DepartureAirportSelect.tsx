import { departureAirportNames } from "@/entities/trip/model/departureAirport";

export function DepartureAirportSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm">
      Departure airport
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 block min-h-11 w-full rounded-xl border border-border bg-background px-3 py-2 text-text"
      >
        <option value="">I’ll decide later</option>
        {Object.entries(departureAirportNames).map(([code, name]) => (
          <option key={code} value={code}>
            {name} ({code})
          </option>
        ))}
      </select>
    </label>
  );
}
