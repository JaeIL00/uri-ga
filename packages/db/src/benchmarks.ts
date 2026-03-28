export type BenchmarkHouseholdSize = 2 | 3 | 4;

export type BenchmarkEntry = {
  householdSize: BenchmarkHouseholdSize;
  category: string;
  monthlyAverage: number;
  note: string;
};

export const FAMILY_BENCHMARKS: BenchmarkEntry[] = [
  { householdSize: 2, category: "Groceries", monthlyAverage: 520000, note: "Two-adult baseline with mixed home cooking." },
  { householdSize: 2, category: "Transport", monthlyAverage: 180000, note: "Public transit and occasional taxi usage." },
  { householdSize: 2, category: "Utilities", monthlyAverage: 160000, note: "Electricity, gas, water, and mobile plan bundle." },
  { householdSize: 3, category: "Groceries", monthlyAverage: 710000, note: "Three-person household with school lunch overlap." },
  { householdSize: 3, category: "Transport", monthlyAverage: 240000, note: "Mix of transit, fuel, and parking." },
  { householdSize: 3, category: "Utilities", monthlyAverage: 210000, note: "Family bundle including broadband." },
  { householdSize: 4, category: "Groceries", monthlyAverage: 880000, note: "Four-person household with bulk shopping." },
  { householdSize: 4, category: "Transport", monthlyAverage: 340000, note: "Car ownership plus weekend movement." },
  { householdSize: 4, category: "Utilities", monthlyAverage: 280000, note: "Higher seasonal usage with home broadband." }
];

export function getBenchmarksForHouseholdSize(householdSize: BenchmarkHouseholdSize): BenchmarkEntry[] {
  return FAMILY_BENCHMARKS.filter((entry) => entry.householdSize === householdSize);
}
