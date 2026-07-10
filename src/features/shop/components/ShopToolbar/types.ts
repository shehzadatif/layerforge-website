export interface ShopToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;

  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;

  productCount: number;
}