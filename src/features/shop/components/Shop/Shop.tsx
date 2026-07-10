import { useMemo, useState } from "react";

import ProductGrid from "../ProductGrid/ProductGrid";
import ShopToolbar from "../ShopToolbar/ShopToolbar";

import { useProducts } from "../../hooks/useProducts";

export default function Shop() {
  const { products } = useProducts();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const categories = useMemo(() => {
    return [
      "All",
      ...new Set(products.map((p) => p.category)),
    ];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.description.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        category === "All" ||
        product.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

  return (
    <>
      <ShopToolbar
        search={search}
        onSearchChange={setSearch}
        categories={categories}
        selectedCategory={category}
        onCategoryChange={setCategory}
        productCount={filteredProducts.length}
      />

      <ProductGrid
        products={filteredProducts}
      />
    </>
  );
}