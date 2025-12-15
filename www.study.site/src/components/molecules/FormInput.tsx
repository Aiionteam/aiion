"use client";

import React from "react";
import { Input } from "../atoms/Input";
import { Icon } from "../atoms/Icon";

interface FormInputProps {
  type?: "text" | "password" | "email";
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  icon: "user" | "lock";
  className?: string;
}

export const FormInput: React.FC<FormInputProps> = ({
  type = "text",
  value,
  onChange,
  placeholder,
  icon,
  className = "",
}) => {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
        <Icon name={icon} size={20} />
      </div>
      <Input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="pl-12 pr-4"
      />
    </div>
  );
};

