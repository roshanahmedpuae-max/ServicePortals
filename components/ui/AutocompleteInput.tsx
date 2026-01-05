"use client";

import { useState, useRef, useEffect, forwardRef, InputHTMLAttributes } from "react";

interface AutocompleteInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label: string;
  error?: string;
  required?: boolean;
  suggestions: readonly string[];
  value: string;
  onChange: (value: string) => void;
}

const AutocompleteInput = forwardRef<HTMLInputElement, AutocompleteInputProps>(
  ({ label, error, required, suggestions, value, onChange, className = "", ...props }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // Filter suggestions based on input value
    useEffect(() => {
      if (value.length >= 1) {
        const searchTerm = value.toLowerCase();
        const filtered = suggestions.filter((suggestion) =>
          suggestion.toLowerCase().includes(searchTerm)
        );
        setFilteredSuggestions(filtered);
        setIsOpen(filtered.length > 0);
        setHighlightedIndex(-1);
      } else {
        setFilteredSuggestions([]);
        setIsOpen(false);
      }
    }, [value, suggestions]);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Scroll highlighted item into view within the dropdown only (not the page)
    useEffect(() => {
      if (highlightedIndex >= 0 && listRef.current) {
        const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
        if (highlightedElement) {
          const list = listRef.current;
          const elementTop = highlightedElement.offsetTop;
          const elementBottom = elementTop + highlightedElement.offsetHeight;
          const listScrollTop = list.scrollTop;
          const listHeight = list.clientHeight;

          // Only scroll within the list container, not the page
          if (elementTop < listScrollTop) {
            list.scrollTop = elementTop;
          } else if (elementBottom > listScrollTop + listHeight) {
            list.scrollTop = elementBottom - listHeight;
          }
        }
      }
    }, [highlightedIndex]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredSuggestions.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case "Enter":
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < filteredSuggestions.length) {
            onChange(filteredSuggestions[highlightedIndex]);
            setIsOpen(false);
          }
          break;
        case "Escape":
          setIsOpen(false);
          setHighlightedIndex(-1);
          break;
      }
    };

    const handleSuggestionClick = (suggestion: string) => {
      onChange(suggestion);
      setIsOpen(false);
    };

    // Highlight matching text in suggestion
    const highlightMatch = (text: string, query: string) => {
      if (!query) return text;
      
      const lowerText = text.toLowerCase();
      const lowerQuery = query.toLowerCase();
      const index = lowerText.indexOf(lowerQuery);
      
      if (index === -1) return text;
      
      const before = text.slice(0, index);
      const match = text.slice(index, index + query.length);
      const after = text.slice(index + query.length);
      
      return (
        <>
          {before}
          <span className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 font-semibold px-0.5 rounded">{match}</span>
          {after}
        </>
      );
    };

    return (
      <div ref={containerRef} className="w-full relative">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        
        <div className="relative">
          <input
            ref={ref}
            type="text"
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (value.length >= 1 && filteredSuggestions.length > 0) {
                setIsOpen(true);
              }
            }}
            autoComplete="off"
            className={`
              w-full px-3 py-3 sm:px-4 sm:py-2.5 rounded-xl border border-gray-300
              bg-white text-gray-900 placeholder-gray-400
              transition-all duration-200
              hover:border-gray-400
              focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
              disabled:bg-gray-100 disabled:cursor-not-allowed
              text-base sm:text-sm
              min-h-[48px] sm:min-h-0
              touch-manipulation
              pr-10
              ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}
              ${className}
            `}
            {...props}
          />
          
          {/* Search icon */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Modern Suggestions dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-2 overflow-hidden animate-fade-in">
            <div
              className="rounded-2xl shadow-xl overflow-hidden"
              style={{
                boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(0, 0, 0, 0.05)'
              }}
            >
              {/* Header matching form header */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs font-medium text-white/90 uppercase tracking-wide">
                  Search Results
                </span>
                <span className="text-xs font-semibold text-white bg-white/20 px-2 py-0.5 rounded-full">
                  {filteredSuggestions.length}
                </span>
              </div>
              
              <ul
                ref={listRef}
                className="bg-white max-h-56 overflow-auto"
              >
                {filteredSuggestions.length > 0 ? (
                  filteredSuggestions.map((suggestion, index) => (
                    <li
                      key={suggestion + index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`
                        px-4 py-3.5 cursor-pointer text-sm
                        transition-all duration-150 ease-out
                        flex items-center gap-3
                        border-b border-gray-100 last:border-b-0
                        ${
                          index === highlightedIndex
                            ? "bg-gradient-to-r from-blue-50 to-purple-50"
                            : "bg-white hover:bg-gray-50"
                        }
                      `}
                    >
                      {/* Icon */}
                      <div className={`
                        w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                        transition-all duration-150
                        ${index === highlightedIndex 
                          ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-md' 
                          : 'bg-gray-100 text-gray-500'
                        }
                      `}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      
                      {/* Text */}
                      <span className="font-medium truncate flex-1">
                        {highlightMatch(suggestion, value)}
                      </span>
                      
                      {/* Arrow indicator on highlight */}
                      {index === highlightedIndex && (
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      )}
                    </li>
                  ))
                ) : (
                  <li className="px-4 py-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-600 font-medium">No matches found</p>
                    <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Helper text */}
        {value.length === 0 && (
          <p className="mt-1.5 text-xs text-gray-400 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Start typing to search customers
          </p>
        )}

        {error && (
          <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

AutocompleteInput.displayName = "AutocompleteInput";

export default AutocompleteInput;
