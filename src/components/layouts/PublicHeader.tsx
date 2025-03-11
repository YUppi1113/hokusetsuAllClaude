import React, { useState, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Search, 
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { CATEGORIES, SUBCATEGORIES } from '@/lib/constants';

const PublicHeader: React.FC = () => {
  const [showCategories, setShowCategories] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const categoryTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const location = useLocation();

  // Handle category hover
  const handleCategoryHover = (categoryId: string) => {
    if (categoryTimeoutRef.current) {
      clearTimeout(categoryTimeoutRef.current);
      categoryTimeoutRef.current = null;
    }
    setSelectedCategory(categoryId);
  };

  // Handle mouse leave with delay
  const handleCategoryLeave = () => {
    categoryTimeoutRef.current = setTimeout(() => {
      setSelectedCategory(null);
    }, 300); // Delay to make it easier to move to subcategories
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="mx-auto" style={{ maxWidth: "980px" }}>
        <div className="flex items-center justify-between h-16 px-4">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <img src="/logo.svg" alt="ストアカ" className="h-8 w-auto" />
            </Link>
          </div>

          {/* Category Navigation and Search */}
          <div className="flex items-center relative" ref={dropdownRef}>
            {/* Search Field */}
            <div 
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-md border border-gray-200 cursor-pointer w-64"
              onClick={() => setShowCategories(!showCategories)}
              onMouseEnter={() => setShowCategories(true)}
            >
              <input 
                type="text" 
                placeholder="レッスンを探す" 
                className="border-none focus:outline-none text-gray-700 w-full text-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCategories(true);
                }}
              />
              <Search className="h-5 w-5 ml-2 text-teal-500" />
            </div>

            {/* Category Dropdown */}
            {showCategories && (
              <div 
                className="absolute left-0 top-full bg-white shadow-lg rounded-md p-4 mt-1 w-max z-10"
                onMouseLeave={() => {
                  if (!selectedCategory) {
                    setShowCategories(false);
                  }
                }}
              >
                {selectedCategory ? (
                  // Subcategory View - Same layout as categories
                  <div>
                    <div className="flex items-center text-sm font-bold text-gray-700 mb-3">
                      <button 
                        onClick={() => setSelectedCategory(null)}
                        className="mr-2 text-teal-500 flex items-center"
                      >
                        <ChevronDown className="h-4 w-4 rotate-90" />
                        <span>戻る</span>
                      </button>
                      <span>
                        {CATEGORIES.find(c => c.id === selectedCategory)?.name}のカテゴリー
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4" style={{ width: "700px" }}>
                      <div className="space-y-3">
                        {SUBCATEGORIES[selectedCategory]?.slice(0, Math.ceil(SUBCATEGORIES[selectedCategory]?.length / 2)).map(subcat => (
                          <Link 
                            key={subcat.id}
                            to={`/user/category/${selectedCategory}/${subcat.id}`}
                            className="flex items-center text-gray-600 hover:text-teal-500 transition-colors"
                          >
                            <span>{subcat.name}</span>
                            <span className="ml-2 text-gray-400 text-xs">
                              ({Math.floor(Math.random() * 500)})
                            </span>
                          </Link>
                        ))}
                      </div>
                      <div className="space-y-3">
                        {SUBCATEGORIES[selectedCategory]?.slice(Math.ceil(SUBCATEGORIES[selectedCategory]?.length / 2)).map(subcat => (
                          <Link 
                            key={subcat.id}
                            to={`/user/category/${selectedCategory}/${subcat.id}`}
                            className="flex items-center text-gray-600 hover:text-teal-500 transition-colors"
                          >
                            <span>{subcat.name}</span>
                            <span className="ml-2 text-gray-400 text-xs">
                              ({Math.floor(Math.random() * 500)})
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Main Category View
                  <div>
                    <div className="text-sm font-bold text-gray-700 mb-3">
                      カテゴリーから探す
                    </div>
                    <div className="grid grid-cols-2 gap-4" style={{ width: "700px" }}>
                      <div className="space-y-3">
                        {CATEGORIES.slice(0, Math.ceil(CATEGORIES.length / 2)).map(category => (
                          <div 
                            key={category.id}
                            className="relative cursor-pointer p-2 rounded-md hover:bg-gray-50"
                            onClick={() => setSelectedCategory(category.id)}
                          >
                            <div className="flex items-center text-gray-600 hover:text-teal-500 transition-colors">
                              <span className="mr-2">{category.icon}</span>
                              <span>{category.name}</span>
                              <span className="ml-2 text-gray-400 text-xs">
                                ({Math.floor(Math.random() * 5000)})
                              </span>
                              <ChevronDown className="h-4 w-4 ml-1 -rotate-90 text-gray-400" />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-3">
                        {CATEGORIES.slice(Math.ceil(CATEGORIES.length / 2)).map(category => (
                          <div 
                            key={category.id}
                            className="relative cursor-pointer p-2 rounded-md hover:bg-gray-50"
                            onClick={() => setSelectedCategory(category.id)}
                          >
                            <div className="flex items-center text-gray-600 hover:text-teal-500 transition-colors">
                              <span className="mr-2">{category.icon}</span>
                              <span>{category.name}</span>
                              <span className="ml-2 text-gray-400 text-xs">
                                ({Math.floor(Math.random() * 5000)})
                              </span>
                              <ChevronDown className="h-4 w-4 ml-1 -rotate-90 text-gray-400" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Side - Login/Register Buttons */}
          <div className="flex items-center space-x-4">
            <Link 
              to="/register" 
              state={{ from: location.pathname }} 
              className="px-4 py-2 rounded-md bg-teal-500 text-white font-medium hover:bg-teal-600 transition-colors"
            >
              新規登録
            </Link>
            <Link 
              to="/login" 
              state={{ from: location.pathname }} 
              className="px-4 py-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
            >
              ログイン
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default PublicHeader;