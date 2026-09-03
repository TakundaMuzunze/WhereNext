import type { PlannerAnswers } from "@/entities/trip/model/types";

type TripDetailsField = "departure" | "travelMonth" | "duration" | "budget" | "travellers";

type TripDetailsStepProps = {
  answers: Pick<PlannerAnswers, TripDetailsField>;
  onUpdate: <Field extends TripDetailsField>(field: Field, value: PlannerAnswers[Field]) => void;
};

const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function TripDetailsStep({ answers, onUpdate }: TripDetailsStepProps) {
  return (
    <div className="grid gap-5">
      <div>
        <label htmlFor="departure" className="mb-2 block text-sm font-medium text-text">
          Where are you travelling from?
        </label>
        <input
          id="departure"
          name="departure"
          required
          value={answers.departure}
          onChange={(event) => onUpdate("departure", event.target.value)}
          placeholder="London"
          className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 text-text outline-none focus:border-primary"
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="travel-month" className="mb-2 block text-sm font-medium text-text">
            When do you want to travel?
          </label>
          <select
            id="travel-month"
            name="travelMonth"
            required
            value={answers.travelMonth}
            onChange={(event) => onUpdate("travelMonth", event.target.value)}
            className="w-full cursor-pointer rounded-xl border border-primary/20 bg-background px-4 py-3 text-text outline-none focus:border-primary"
          >
            <option value="" disabled>
              Select a month
            </option>
            {months.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="duration" className="mb-2 block text-sm font-medium text-text">
            Duration
          </label>
          <input
            id="duration"
            name="duration"
            type="number"
            min="1"
            required
            value={answers.duration}
            onChange={(event) => onUpdate("duration", event.target.value === "" ? "" : event.target.valueAsNumber)}
            placeholder="7"
            className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 text-text outline-none focus:border-primary"
          />
        </div>

        <div>
          <label htmlFor="budget" className="mb-2 block text-sm font-medium text-text">
            Budget
          </label>
          <input
            id="budget"
            name="budget"
            type="number"
            min="1"
            required
            value={answers.budget}
            onChange={(event) => onUpdate("budget", event.target.value === "" ? "" : event.target.valueAsNumber)}
            placeholder="£800"
            className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 text-text outline-none focus:border-primary"
          />
        </div>

        <div>
          <label htmlFor="travellers" className="mb-2 block text-sm font-medium text-text">
            Travellers
          </label>
          <input
            id="travellers"
            name="travellers"
            type="number"
            min="1"
            required
            value={answers.travellers}
            onChange={(event) => onUpdate("travellers", event.target.value === "" ? "" : event.target.valueAsNumber)}
            placeholder="2"
            className="w-full rounded-xl border border-primary/20 bg-background px-4 py-3 text-text outline-none focus:border-primary"
          />
        </div>
      </div>
    </div>
  );
}
