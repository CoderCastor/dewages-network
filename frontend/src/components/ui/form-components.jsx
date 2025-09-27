// components/ui/form-components.jsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin } from "lucide-react";

// Base Form Field Component
export const FormField = ({ 
  label, 
  error, 
  required = false, 
  children, 
  className = "" 
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`space-y-2 ${className}`}
  >
    <label className="block text-sm font-medium text-gray-700">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {children}
    <AnimatePresence>
      {error && (
        <motion.p
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="text-red-500 text-sm"
        >
          {error}
        </motion.p>
      )}
    </AnimatePresence>
  </motion.div>
);

// Input Component
export const Input = ({ error, className = "", ...props }) => (
  <input
    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
      error ? "border-red-500 focus:ring-red-500" : "border-gray-300"
    } ${className}`}
    {...props}
  />
);

// Textarea Component
export const Textarea = ({ error, className = "", ...props }) => (
  <textarea
    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none ${
      error ? "border-red-500 focus:ring-red-500" : "border-gray-300"
    } ${className}`}
    {...props}
  />
);

// Select Component
export const Select = ({ 
  error, 
  options, 
  placeholder, 
  className = "", 
  ...props 
}) => (
  <select
    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white ${
      error ? "border-red-500 focus:ring-red-500" : "border-gray-300"
    } ${className}`}
    {...props}
  >
    {placeholder && <option value="">{placeholder}</option>}
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

// Checkbox Group Component
export const CheckboxGroup = ({
  options,
  value = [],
  onChange,
  error,
  maxSelections,
}) => {
  const handleToggle = (optionValue) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue));
    } else {
      if (!maxSelections || value.length < maxSelections) {
        onChange([...value, optionValue]);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {options.map((option) => (
        <motion.div
          key={option.value}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <label
            className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
              value.includes(option.value)
                ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                : error
                ? "border-red-500 hover:border-red-400"
                : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
            }`}
          >
            <input
              type="checkbox"
              checked={value.includes(option.value)}
              onChange={() => handleToggle(option.value)}
              className="sr-only"
            />
            <div className="flex items-center space-x-3">
              <div
                className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${
                  value.includes(option.value)
                    ? "bg-blue-500 border-blue-500"
                    : "border-gray-300"
                }`}
              >
                {value.includes(option.value) && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-2 h-2 bg-white rounded-full"
                  />
                )}
              </div>
              <span className="text-sm font-medium">{option.label}</span>
            </div>
          </label>
        </motion.div>
      ))}
      {maxSelections && (
        <p className="text-sm text-gray-500 col-span-full mt-2">
          {value.length}/{maxSelections} selected
        </p>
      )}
    </div>
  );
};

// Skills Input Component
export const SkillsInput = ({
  value = [],
  onChange,
  suggestions = [],
  error,
  maxSkills = 20
}) => {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = suggestions.filter(
    skill => 
      skill.toLowerCase().includes(inputValue.toLowerCase()) &&
      !value.includes(skill)
  );

  const addSkill = (skill) => {
    if (!value.includes(skill) && value.length < maxSkills) {
      onChange([...value, skill]);
    }
    setInputValue("");
    setShowSuggestions(false);
  };

  const removeSkill = (skill) => {
    onChange(value.filter(s => s !== skill));
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      addSkill(inputValue.trim());
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Input
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          onKeyDown={handleKeyPress}
          placeholder="Type a skill and press Enter"
          error={error}
        />
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filteredSuggestions.slice(0, 10).map((skill) => (
              <button
                key={skill}
                type="button"
                onMouseDown={() => addSkill(skill)}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors"
              >
                {skill}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <AnimatePresence>
        {value.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2"
          >
            {value.map((skill) => (
              <motion.span
                key={skill}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => removeSkill(skill)}
                  className="ml-2 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <X size={14} />
                </button>
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      
      <p className="text-sm text-gray-500">
        {value.length}/{maxSkills} skills selected
      </p>
    </div>
  );
};

// Time Input Component
export const TimeInput = ({ value, onChange, error, ...props }) => (
  <Input
    type="time"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    error={error}
    {...props}
  />
);

// Checkbox Component
export const Checkbox = ({ checked, onChange, label, className = "" }) => (
  <label className={`flex items-center space-x-3 cursor-pointer ${className}`}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 transition-colors"
    />
    <span className="text-sm font-medium text-gray-700">{label}</span>
  </label>
);

// Location Input Component
export const LocationInput = ({ 
  location = {}, 
  onChange, 
  errors = {} 
}) => {
  const handleLocationChange = (field, value) => {
    onChange({
      ...location,
      [field]: value
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 text-gray-700">
        <MapPin size={20} />
        <h3 className="font-medium">Location Details</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Address" error={errors.address}>
          <Input
            value={location.address || ""}
            onChange={(e) => handleLocationChange("address", e.target.value)}
            placeholder="Street address"
            error={!!errors.address}
          />
        </FormField>
        
        <FormField label="City" error={errors.city}>
          <Input
            value={location.city || ""}
            onChange={(e) => handleLocationChange("city", e.target.value)}
            placeholder="City"
            error={!!errors.city}
          />
        </FormField>
        
        <FormField label="State" error={errors.state}>
          <Input
            value={location.state || ""}
            onChange={(e) => handleLocationChange("state", e.target.value)}
            placeholder="State"
            error={!!errors.state}
          />
        </FormField>
        
        <FormField label="Country" error={errors.country}>
          <Input
            value={location.country || "India"}
            onChange={(e) => handleLocationChange("country", e.target.value)}
            error={!!errors.country}
          />
        </FormField>
      </div>
    </div>
  );
};