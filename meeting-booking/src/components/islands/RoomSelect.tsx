import type { Car } from "../../lib/api";

type CarSelectProps = {
  cars: Car[];
  value: string;
  onChange: (carId: string) => void;
  disabled?: boolean;
};

export function CarSelect({ cars, value, onChange, disabled = false }: CarSelectProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">Car</span>
      <select
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-500"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        {cars.map((car) => (
          <option key={car.id} value={car.id}>
            {car.name} ({car.seats} seats)
          </option>
        ))}
      </select>
    </label>
  );
}
