"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Search, X, Check, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface SelectOption {
  value: string;
  label: string;
  avatar?: string;
}

interface MultiSelectProps {
  options: SelectOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  label: string;
}

export function MultiSelect({
  options,
  selectedValues,
  onChange,
  placeholder,
  label,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleToggle = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedValues.filter((v) => v !== value));
  };

  const getOptionByValue = (value: string) => {
    return options.find((opt) => opt.value === value);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
        {label}
      </label>
      <div
        className="relative w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm cursor-pointer min-h-[40px] flex items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="flex-1 flex flex-wrap gap-1.5">
            {selectedValues.length === 0 ? (
              <span className="text-zinc-500 text-sm">
                {placeholder || "Select..."}
              </span>
            ) : (
              selectedValues.map((value) => {
                const option = getOptionByValue(value);
                return (
                  <Badge
                    key={value}
                    variant="secondary"
                    className="pl-1 pr-1 py-0.5 gap-1 font-normal bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400"
                  >
                    {option?.avatar && (
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={option.avatar} />
                        <AvatarFallback>
                          {option.label.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    {option?.label || value}
                    <button
                      onClick={(e) => handleRemove(value, e)}
                      className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })
            )}
          </div>
          <div className="flex items-center gap-1">
            {selectedValues.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearAll}
                className="h-6 w-6 text-zinc-400"
                title="Clear all"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <ChevronDown
              className={`h-4 w-4 text-zinc-400 transition-transform ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>
      </div>

      {isOpen && (
        <Card className="absolute z-20 w-full mt-1 bg-white dark:bg-zinc-900 shadow-lg border-zinc-200 dark:border-zinc-800">
          <div className="p-2 border-b border-zinc-200 dark:border-zinc-800">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-400" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="pl-8 h-8 text-xs"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-4 text-xs text-center text-zinc-500">
                No results found
              </div>
            ) : (
              <>
                {selectedValues.length > 0 && (
                  <Button
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange([]);
                    }}
                    className="w-full justify-start h-8 px-2 text-xs text-zinc-500 mb-1 border-b border-zinc-100 dark:border-zinc-800 rounded-none"
                  >
                    Clear all ({selectedValues.length} selected)
                  </Button>
                )}
                {filteredOptions.map((option) => {
                  const isSelected = selectedValues.includes(option.value);
                  return (
                    <Button
                      key={option.value}
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggle(option.value);
                      }}
                      className={`w-full justify-between h-auto py-2 px-3 text-sm font-normal ${
                        isSelected
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                          : ""
                      }`}
                    >
                      <span className="flex items-center gap-2 flex-1 min-w-0">
                        {option.avatar ? (
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={option.avatar} />
                            <AvatarFallback>
                              {option.label.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-zinc-400" />
                          </div>
                        )}
                        <span className="truncate">{option.label}</span>
                      </span>
                      {isSelected && (
                        <Check className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      )}
                    </Button>
                  );
                })}
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
