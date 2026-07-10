import SearchBar from "../SearchBar/SearchBar";
import type { ShopToolbarProps } from "./types";
import { FilterChip } from "../../../../components/ui";

export default function ShopToolbar({
  search,
  onSearchChange,
  categories,
  selectedCategory,
  onCategoryChange,
  productCount,
}: ShopToolbarProps) {
  return (
    <div className="mb-10 rounded-2xl bg-white p-6 shadow-sm">

      <SearchBar
        value={search}
        onChange={onSearchChange}
      />

      <div className="mt-6 flex flex-wrap gap-3">

        {categories.map((category) => (
  <FilterChip
    key={category}
    label={category}
    active={selectedCategory === category}
    onClick={() => onCategoryChange(category)}
  />
))}
      </div>

      <div className="mt-6 text-sm text-slate-500">
        {productCount} products
      </div>

    </div>
  );
}