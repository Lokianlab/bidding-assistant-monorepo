'use client';

interface CategoryItem {
  name: string;
  count: number;
  children?: { name: string; count: number }[];
}

interface CategoryBrowserProps {
  categories: CategoryItem[];
  selectedCategory: string | null;
  selectedSubcategory: string | null;
  onSelect: (category: string | null, subcategory: string | null) => void;
}

export function CategoryBrowser({
  categories,
  selectedCategory,
  selectedSubcategory,
  onSelect,
}: CategoryBrowserProps) {
  return (
    <div className="space-y-1">
      <button
        onClick={() => onSelect(null, null)}
        className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors ${
          !selectedCategory ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-100'
        }`}
      >
        全部
      </button>
      {categories.map((cat) => (
        <div key={cat.name}>
          <button
            onClick={() => onSelect(cat.name, null)}
            className={`w-full text-left px-3 py-1.5 rounded text-sm transition-colors flex justify-between ${
              selectedCategory === cat.name && !selectedSubcategory
                ? 'bg-blue-100 text-blue-800'
                : 'hover:bg-gray-100'
            }`}
          >
            <span>{cat.name}</span>
            <span className="text-gray-400">{cat.count}</span>
          </button>
          {selectedCategory === cat.name && cat.children && cat.children.length > 0 && (
            <div className="ml-4 space-y-0.5">
              {cat.children.map((sub) => (
                <button
                  key={sub.name}
                  onClick={() => onSelect(cat.name, sub.name)}
                  className={`w-full text-left px-3 py-1 rounded text-xs transition-colors flex justify-between ${
                    selectedSubcategory === sub.name
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  <span>{sub.name}</span>
                  <span className="text-gray-400">{sub.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
