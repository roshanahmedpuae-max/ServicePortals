"use client";

import { useState, useRef, useEffect, forwardRef } from "react";
import { createPortal } from "react-dom";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  error?: string;
  required?: boolean;
  options: SelectOption[];
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  name?: string;
}

const Select = forwardRef<HTMLInputElement, SelectProps>(
  ({ label, error, required, options, placeholder = "Select an option", value, onChange, disabled, className = "", name }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const [mounted, setMounted] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    // Ensure component is mounted before using portal
    useEffect(() => {
      setMounted(true);
    }, []);

    // Calculate dropdown position
    useEffect(() => {
      if (isOpen && buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;
        
        setDropdownStyle({
          position: 'absolute',
          top: rect.bottom + scrollY + 8,
          left: rect.left + scrollX,
          width: rect.width,
          zIndex: 99999,
        });
      }
    }, [isOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        if (
          containerRef.current && 
          !containerRef.current.contains(target) &&
          !(event.target as HTMLElement).closest('[data-select-dropdown]')
        ) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
      }
    }, [isOpen]);

    // Handle scroll and resize
    useEffect(() => {
      const updatePosition = () => {
        if (isOpen && buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          const scrollY = window.scrollY;
          const scrollX = window.scrollX;
          
          setDropdownStyle({
            position: 'absolute',
            top: rect.bottom + scrollY + 8,
            left: rect.left + scrollX,
            width: rect.width,
            zIndex: 99999,
          });
        }
      };

      if (isOpen) {
        window.addEventListener("scroll", updatePosition, true);
        window.addEventListener("resize", updatePosition);
        return () => {
          window.removeEventListener("scroll", updatePosition, true);
          window.removeEventListener("resize", updatePosition);
        };
      }
    }, [isOpen]);

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

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;

      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault();
          if (isOpen && highlightedIndex >= 0) {
            handleSelect(options[highlightedIndex].value);
          } else {
            setIsOpen(!isOpen);
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
          } else {
            setHighlightedIndex((prev) =>
              prev < options.length - 1 ? prev + 1 : prev
            );
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          if (isOpen) {
            setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          }
          break;
        case "Escape":
          setIsOpen(false);
          setHighlightedIndex(-1);
          break;
      }
    };

    const handleSelect = (optionValue: string) => {
      onChange?.(optionValue);
      setIsOpen(false);
      setHighlightedIndex(-1);
    };

    const toggleDropdown = () => {
      if (!disabled) {
        setIsOpen(!isOpen);
        if (!isOpen) {
          const currentIndex = options.findIndex(opt => opt.value === value);
          setHighlightedIndex(currentIndex >= 0 ? currentIndex : 0);
        }
      }
    };

    // Dropdown content
    const dropdownContent = isOpen && mounted ? (
      <div 
        data-select-dropdown
        style={dropdownStyle}
        className="animate-fade-in"
      >
        <div
          className="bg-white rounded-2xl shadow-2xl border border-gray-200"
          style={{
            boxShadow: '0 20px 50px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
          }}
        >
          <ul
            ref={listRef}
            className="py-2 max-h-60 overflow-auto"
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isHighlighted = index === highlightedIndex;
              
              return (
                <li
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`
                    mx-2 px-4 py-3 cursor-pointer text-sm rounded-xl
                    transition-all duration-150 ease-out
                    flex items-center gap-3
                    ${isSelected
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                      : isHighlighted
                        ? "bg-gray-100 text-gray-900"
                        : "text-gray-700 hover:bg-gray-50"
                    }
                  `}
                >
                  {/* Radio indicator */}
                  <div className={`
                    w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                    transition-all duration-150
                    ${isSelected 
                      ? "border-white bg-white" 
                      : "border-gray-300 bg-white"
                    }
                  `}>
                    {isSelected && (
                      <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
                    )}
                  </div>
                  
                  {/* Option Label */}
                  <span className="font-medium flex-1">
                    {option.label}
                  </span>
                  
                  {/* Checkmark for selected */}
                  {isSelected && (
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    ) : null;

    return (
      <div ref={containerRef} className="w-full relative">
        {/* Hidden input for form compatibility */}
        <input
          ref={ref}
          type="hidden"
          name={name}
          value={value || ""}
        />
        
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        {/* Custom Select Button */}
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleDropdown}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={`
            w-full px-3 py-3 sm:px-4 sm:py-2.5 rounded-xl border border-gray-300
            bg-white text-left
            transition-all duration-200 cursor-pointer
            hover:border-gray-400 hover:shadow-sm
            focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:shadow-md focus:outline-none
            disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60
            text-base sm:text-sm
            min-h-[48px] sm:min-h-0
            touch-manipulation
            flex items-center justify-between gap-2
            ${isOpen ? "border-blue-500 ring-2 ring-blue-500/20 shadow-md" : ""}
            ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}
            ${className}
          `}
        >
          <span className={`truncate ${selectedOption ? "text-gray-900" : "text-gray-400"}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          
          {/* Dropdown Arrow */}
          <div className={`
            w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
            transition-all duration-200
            ${isOpen 
              ? "bg-gradient-to-br from-blue-500 to-purple-500 text-white rotate-180" 
              : "bg-gradient-to-br from-blue-50 to-purple-50 text-blue-600"
            }
          `}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Render dropdown via portal */}
        {mounted && typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}
        
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

Select.displayName = "Select";

export default Select;
