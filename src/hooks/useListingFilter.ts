import { useMemo } from "react";

interface FilterOptions {
  categoryId?: string | null;
  categoryName?: string | null;
  companyId?: string | null;
  itemId?: string | null;
  specifications?: Record<string, string>;
}

interface Item {
  id: string;
  name: string;
  categoryId?: string;
  companies?: Array<{ companyId: string }>;
  specifications?: Array<{
    id: string;
    name: string;
    valueType: string;
    options?: string;
  }>;
}

/**
 * Custom hook to filter items/products based on selected options
 * Filters items by category, company, and specifications
 */
export function useListingFilter(items: Item[], filterOptions: FilterOptions) {
  return useMemo(() => {
    if (!items || items.length === 0) return [];

    let filtered = [...items];

    // Filter by category
    if (filterOptions.categoryId) {
      filtered = filtered.filter(
        (item) => item.categoryId === filterOptions.categoryId
      );
    }

    // Filter by company
    if (filterOptions.companyId) {
      filtered = filtered.filter((item) =>
        item.companies?.some((c) => c.companyId === filterOptions.companyId)
      );
    }

    // Filter by specifications
    if (
      filterOptions.specifications &&
      Object.keys(filterOptions.specifications).length > 0
    ) {
      filtered = filtered.filter((item) => {
        if (!item.specifications || item.specifications.length === 0) {
          return false;
        }

        // Check if item has all required specifications with matching values
        if (!filterOptions.specifications) return true;

        return Object.entries(filterOptions.specifications).every(
          ([specId, value]) => {
            const itemSpec = item.specifications?.find((s) => s.id === specId);
            if (!itemSpec) return false;

            // For select type specs, check if the value is in options
            if (itemSpec.valueType === "select" && itemSpec.options) {
              try {
                const options = JSON.parse(itemSpec.options);
                return options.includes(value);
              } catch {
                return false;
              }
            }

            // For text type specs, just check if spec exists
            return true;
          }
        );
      });
    }

    return filtered;
  }, [items, filterOptions]);
}
