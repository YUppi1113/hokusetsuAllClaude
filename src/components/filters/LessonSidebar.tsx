import { useState } from 'react';
import { Search, X, MapPin, Filter, Calendar, DollarSign, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CATEGORIES, SUBCATEGORIES } from '@/lib/constants';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// Types
interface LessonSidebarProps {
  searchKeyword: string;
  setSearchKeyword: (value: string) => void;
  selectedLessonTypes: {
    monthly: boolean;
    single_course: boolean;
  };
  setSelectedLessonTypes: (value: {
    monthly: boolean;
    single_course: boolean;
  }) => void;
  selectedLocationTypes: {
    in_person: boolean;
    online: boolean;
  };
  setSelectedLocationTypes: (value: {
    in_person: boolean;
    online: boolean;
  }) => void;
  selectedAreas: string[];
  setSelectedAreas: (value: string[]) => void;
  selectedCategory: string | null;
  setSelectedCategory: (value: string | null) => void;
  selectedSubCategories: string[];
  setSelectedSubCategories: (value: string[]) => void;
  expandedSubCategories: Record<string, boolean>;
  setExpandedSubCategories: (value: Record<string, boolean>) => void;
  availableSubcategories: any[];
  setAvailableSubcategories: (value: any[]) => void;
  allDates: boolean;
  setAllDates: (value: boolean) => void;
  startDate: string;
  setStartDate: (value: string) => void;
  endDate: string;
  setEndDate: (value: string) => void;
  minPrice: string;
  setMinPrice: (value: string) => void;
  maxPrice: string;
  setMaxPrice: (value: string) => void;
  selectedPriceRanges: {
    monthly: string[];
    single_course: string[];
  };
  setSelectedPriceRanges: (value: {
    monthly: string[];
    single_course: string[];
  }) => void;
  resetAllFilters: () => void;
  handleSearchSubmit: (e: React.FormEvent) => void;
}

// Price ranges
const singleCoursePriceRanges = [
  { id: 'under1000', label: '〜1,000円', min: 0, max: 1000 },
  { id: '1000to3000', label: '1,000円〜3,000円', min: 1000, max: 3000 },
  { id: '3000to5000', label: '3,000円〜5,000円', min: 3000, max: 5000 },
  { id: '5000to10000', label: '5,000円〜10,000円', min: 5000, max: 10000 },
  { id: 'over10000', label: '10,000円以上', min: 10000, max: Infinity }
];

// 月謝制の価格帯
const monthlyPriceRanges = [
  { id: 'under5000', label: '5,000円/月', min: 0, max: 5000 },
  { id: '5000to10000', label: '5,000円〜10,000円/月', min: 5000, max: 10000 },
  { id: '10000to20000', label: '10,000円〜20,000円/月', min: 10000, max: 20000 },
  { id: 'over20000', label: '20,000円以上/月', min: 20000, max: Infinity }
];

// 北摂エリアの市町村リスト
const kitasetsuAreas = [
  '豊中市', '吹田市', '茨木市', '高槻市', '箕面市', '摂津市', '島本町', '豊能町', '能勢町'
];

const LessonSidebar = ({
  searchKeyword,
  setSearchKeyword,
  selectedLessonTypes,
  setSelectedLessonTypes,
  selectedLocationTypes,
  setSelectedLocationTypes,
  selectedAreas,
  setSelectedAreas,
  selectedCategory,
  setSelectedCategory,
  selectedSubCategories,
  setSelectedSubCategories,
  expandedSubCategories,
  setExpandedSubCategories,
  availableSubcategories,
  setAvailableSubcategories,
  allDates,
  setAllDates,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  selectedPriceRanges,
  setSelectedPriceRanges,
  resetAllFilters,
  handleSearchSubmit
}: LessonSidebarProps) => {

  // Toggle subcategory expansion
  const toggleSubCategory = (categoryId: string) => {
    setExpandedSubCategories({
      ...expandedSubCategories,
      [categoryId]: !expandedSubCategories[categoryId]
    });
  };

  // Handle subcategory selection
  const handleSubcategoryChange = (subcategoryId: string) => {
    if (selectedSubCategories.includes(subcategoryId)) {
      setSelectedSubCategories(selectedSubCategories.filter(id => id !== subcategoryId));
    } else {
      setSelectedSubCategories([...selectedSubCategories, subcategoryId]);
    }
  };

  // Toggle all price ranges
  const toggleAllPriceRanges = (type: 'monthly' | 'single_course') => {
    const priceRanges = type === 'monthly' ? monthlyPriceRanges : singleCoursePriceRanges;
    const allIds = priceRanges.map(range => range.id);
    
    if (selectedPriceRanges[type].length === allIds.length) {
      setSelectedPriceRanges({
        ...selectedPriceRanges,
        [type]: []
      });
    } else {
      setSelectedPriceRanges({
        ...selectedPriceRanges,
        [type]: [...allIds]
      });
    }
  };

  // Toggle all areas
  const toggleAllAreas = () => {
    if (selectedAreas.length === kitasetsuAreas.length) {
      setSelectedAreas([]);
    } else {
      setSelectedAreas([...kitasetsuAreas]);
    }
  };

  const clearSearch = () => {
    setSearchKeyword('');
  };

  // Handle date picker changes
  const handleStartDateChange = (date: Date | null) => {
    if (date) {
      setStartDate(date.toISOString().split('T')[0]);
      setAllDates(false);
    } else {
      setStartDate('');
    }
  };

  const handleEndDateChange = (date: Date | null) => {
    if (date) {
      setEndDate(date.toISOString().split('T')[0]);
      setAllDates(false);
    } else {
      setEndDate('');
    }
  };

  return (
    <div className="w-60 mr-6">
      <div className="mb-6">
      </div>

      {/* Keyword search */}
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <Search className="h-5 w-5 mr-2 text-gray-500" />
          <span className="text-gray-800 font-medium">キーワードで絞り込む</span>
        </div>
        <form onSubmit={handleSearchSubmit}>
          <div className="relative mb-2">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder=""
              className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm"
            />
            {searchKeyword && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button 
            type="submit" 
            className="w-full bg-teal-500 hover:bg-teal-600 text-white rounded-md py-2"
          >
            絞り込む
          </Button>
        </form>
      </div>

      {/* Lesson Format Filter */}
      <div className="mb-6 border-t border-gray-200 pt-4">
        <div className="flex items-center mb-2">
          <Filter className="h-5 w-5 mr-2 text-gray-500" />
          <span className="text-gray-800 font-medium">レッスン形式</span>
        </div>
        
        <div className="space-y-3 mt-2 ml-2">
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">料金形態</div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="type-monthly"
                className="h-4 w-4 text-teal-500 border-gray-300 rounded focus:ring-teal-500"
                checked={selectedLessonTypes.monthly}
                onChange={(e) => setSelectedLessonTypes({
                  ...selectedLessonTypes,
                  monthly: e.target.checked
                })}
              />
              <label htmlFor="type-monthly" className="ml-2 text-sm text-gray-700">月謝制</label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="type-single-course"
                className="h-4 w-4 text-teal-500 border-gray-300 rounded focus:ring-teal-500"
                checked={selectedLessonTypes.single_course}
                onChange={(e) => setSelectedLessonTypes({
                  ...selectedLessonTypes,
                  single_course: e.target.checked
                })}
              />
              <label htmlFor="type-single-course" className="ml-2 text-sm text-gray-700">単発・コース講座</label>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">受講形式</div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="location-inperson"
                className="h-4 w-4 text-teal-500 border-gray-300 rounded focus:ring-teal-500"
                checked={selectedLocationTypes.in_person}
                onChange={(e) => {
                  setSelectedLocationTypes({
                    ...selectedLocationTypes,
                    in_person: e.target.checked
                  });
                }}
              />
              <label htmlFor="location-inperson" className="ml-2 text-sm text-gray-700">対面</label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="location-online"
                className="h-4 w-4 text-teal-500 border-gray-300 rounded focus:ring-teal-500"
                checked={selectedLocationTypes.online}
                onChange={(e) => setSelectedLocationTypes({
                  ...selectedLocationTypes,
                  online: e.target.checked
                })}
              />
              <label htmlFor="location-online" className="ml-2 text-sm text-gray-700">オンライン</label>
            </div>
          </div>
          
          <Button 
            className="w-full bg-teal-500 hover:bg-teal-600 text-white rounded-md py-2"
          >
            この条件で絞り込む
          </Button>
        </div>
      </div>

      {/* Area filter (only when in-person is selected) */}
      {selectedLocationTypes.in_person && (
        <div className="mb-6 border-t border-gray-200 pt-4">
          <div className="flex items-center mb-2">
            <MapPin className="h-5 w-5 mr-2 text-gray-500" />
            <span className="text-gray-800 font-medium">エリアから探す</span>
          </div>
          
          <div className="space-y-2 mt-2 ml-2">
            <div className="flex justify-between mb-2">
              <button 
                className="text-xs text-teal-500 hover:underline"
                onClick={toggleAllAreas}
              >
                {selectedAreas.length === kitasetsuAreas.length ? "すべて解除" : "すべて選択"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {kitasetsuAreas.map(area => (
                <div key={area} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`area-${area}`}
                    className="h-4 w-4 text-teal-500 border-gray-300 rounded focus:ring-teal-500"
                    checked={selectedAreas.includes(area)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAreas([...selectedAreas, area]);
                      } else {
                        setSelectedAreas(selectedAreas.filter(a => a !== area));
                      }
                    }}
                  />
                  <label htmlFor={`area-${area}`} className="ml-2 text-sm text-gray-700">{area}</label>
                </div>
              ))}
            </div>
            
            <Button 
              className="w-full bg-teal-500 hover:bg-teal-600 text-white rounded-md py-2 mt-3"
            >
              この条件で絞り込む
            </Button>
          </div>
        </div>
      )}



      {/* Date filter */}
      <div className="mb-6 border-t border-gray-200 pt-4">
        <div className="flex items-center mb-2">
          <Calendar className="h-5 w-5 mr-2 text-gray-500" />
          <span className="text-gray-800 font-medium">日程で絞り込む</span>
        </div>
        
        <div className="mt-2 ml-2">
          <div className="mb-2">
            <label className="block text-sm text-gray-700 mb-1">いつから</label>
            <DatePicker 
              selected={startDate ? new Date(startDate) : null}
              onChange={handleStartDateChange}
              dateFormat="yyyy/MM/dd"
              className="w-full border border-gray-300 rounded-md py-1.5 px-2 text-sm"
              placeholderText="開始日を選択"
              disabled={allDates}
            />
          </div>
          <div className="mb-3">
            <label className="block text-sm text-gray-700 mb-1">いつまで</label>
            <DatePicker 
              selected={endDate ? new Date(endDate) : null}
              onChange={handleEndDateChange}
              dateFormat="yyyy/MM/dd"
              className="w-full border border-gray-300 rounded-md py-1.5 px-2 text-sm"
              placeholderText="終了日を選択"
              disabled={allDates}
              minDate={startDate ? new Date(startDate) : undefined}
            />
          </div>
          <div className="mb-3">
            <label className="flex items-center">
              <input 
                type="checkbox"
                checked={allDates}
                onChange={(e) => setAllDates(e.target.checked)}
                className="h-4 w-4 text-teal-500 border-gray-300 rounded focus:ring-teal-500"
              />
              <span className="ml-2 text-sm text-gray-700">すべての日程</span>
            </label>
          </div>
          <Button 
            className="w-full bg-teal-500 hover:bg-teal-600 text-white rounded-md py-2"
            disabled={allDates || !startDate || !endDate}
            onClick={() => setAllDates(false)}
          >
            絞り込む
          </Button>
        </div>
      </div>

      {/* Price filter */}
      <div className="mb-6 border-t border-gray-200 pt-4">
        <div className="flex items-center mb-2">
          <DollarSign className="h-5 w-5 mr-2 text-gray-500" />
          <span className="text-gray-800 font-medium">価格で絞り込む</span>
        </div>
        
        <div className="space-y-4 mt-2 ml-2">
          
          {/* 単発・コース講座の価格 */}
          {selectedLessonTypes.single_course && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-medium text-gray-700">単発・コース講座</h5>
                <button 
                  className="text-xs text-teal-500 hover:underline"
                  onClick={() => toggleAllPriceRanges('single_course')}
                >
                  すべて選択 / 解除
                </button>
              </div>
              <div className="space-y-2">
                {singleCoursePriceRanges.map(range => (
                  <div key={range.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`price-${range.id}`}
                      className="h-4 w-4 text-teal-500 border-gray-300 rounded focus:ring-teal-500"
                      checked={selectedPriceRanges.single_course.includes(range.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPriceRanges({
                            ...selectedPriceRanges,
                            single_course: [...selectedPriceRanges.single_course, range.id]
                          });
                        } else {
                          setSelectedPriceRanges({
                            ...selectedPriceRanges,
                            single_course: selectedPriceRanges.single_course.filter(id => id !== range.id)
                          });
                        }
                      }}
                    />
                    <label htmlFor={`price-${range.id}`} className="ml-2 text-sm text-gray-700">{range.label}</label>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* 月謝制の価格 */}
          {selectedLessonTypes.monthly && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h5 className="text-sm font-medium text-gray-700">月謝制</h5>
                <button 
                  className="text-xs text-teal-500 hover:underline"
                  onClick={() => toggleAllPriceRanges('monthly')}
                >
                  すべて選択 / 解除
                </button>
              </div>
              <div className="space-y-2">
                {monthlyPriceRanges.map(range => (
                  <div key={range.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`monthly-price-${range.id}`}
                      className="h-4 w-4 text-teal-500 border-gray-300 rounded focus:ring-teal-500"
                      checked={selectedPriceRanges.monthly.includes(range.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPriceRanges({
                            ...selectedPriceRanges,
                            monthly: [...selectedPriceRanges.monthly, range.id]
                          });
                        } else {
                          setSelectedPriceRanges({
                            ...selectedPriceRanges,
                            monthly: selectedPriceRanges.monthly.filter(id => id !== range.id)
                          });
                        }
                      }}
                    />
                    <label htmlFor={`monthly-price-${range.id}`} className="ml-2 text-sm text-gray-700">{range.label}</label>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <Button 
            className="w-full bg-teal-500 hover:bg-teal-600 text-white rounded-md py-2"
          >
            この条件で絞り込む
          </Button>
        </div>
      </div>

            {/* Category filter */}
            <div className="mb-6 border-t border-gray-200 pt-4">
        <div className="flex items-center mb-2">
          <Filter className="h-5 w-5 mr-2 text-gray-500" />
          <span className="text-gray-800 font-medium">カテゴリーから探す</span>
        </div>
        
        <div className="space-y-2 mt-2 ml-2">
          {CATEGORIES.map(category => (
            <div key={category.id}>
              <div 
                className="flex items-center justify-between w-full text-left py-1 cursor-pointer"
                onClick={() => {
                  // Set category or toggle it off if it's already selected
                  const isCurrentlySelected = selectedCategory === category.id;
                  setSelectedCategory(isCurrentlySelected ? null : category.id);
                  
                  // If setting a new category, initialize its subcategories
                  if (!isCurrentlySelected && SUBCATEGORIES[category.id]) {
                    setAvailableSubcategories(SUBCATEGORIES[category.id]);
                  }
                  
                  // Toggle expansion
                  toggleSubCategory(category.id);
                }}
              >
                <div className="flex items-center">
                  <span className="mr-2 text-gray-700 flex items-center">
                    <span className="mr-1">{category.icon}</span>
                    <span className="text-sm font-medium">{category.name}</span>
                  </span>
                </div>
                {expandedSubCategories[category.id] ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </div>
              
              {/* Subcategories - Show when category is expanded */}
              {expandedSubCategories[category.id] && SUBCATEGORIES[category.id] && (
                <div className="ml-6 space-y-1 mt-1 mb-2">
                  {SUBCATEGORIES[category.id].map(subCat => (
                    <div key={`${category.id}-${subCat.id}`} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`subcat-${category.id}-${subCat.id}`}
                        className="h-4 w-4 text-teal-500 border-gray-300 rounded focus:ring-teal-500"
                        checked={selectedSubCategories.includes(subCat.id)}
                        onChange={() => handleSubcategoryChange(subCat.id)}
                      />
                      <label htmlFor={`subcat-${category.id}-${subCat.id}`} className="ml-2 text-xs text-gray-600">
                        {subCat.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          <Button 
            className="w-full bg-teal-500 hover:bg-teal-600 text-white rounded-md py-2 mt-3"
          >
            この条件で絞り込む
          </Button>
        </div>
      </div>

      {/* Clear filters button */}
      <div className="border-t border-gray-200 pt-4">
        <Button 
          variant="outline"
          onClick={resetAllFilters}
          className="w-full border-gray-300 text-gray-700 hover:bg-gray-100 rounded-md py-2"
        >
          絞り込みをリセット
        </Button>
      </div>
    </div>
  );
};

export { LessonSidebar, singleCoursePriceRanges, monthlyPriceRanges, kitasetsuAreas };