import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface StatusDropdownProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const statusOptions = [
  { value: 'nouveau', label: 'Nouveau', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'contacte', label: 'Contacté', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { value: 'interesse', label: 'Intéressé', color: 'bg-green-100 text-green-800 border-green-200' },
  { value: 'non_interesse', label: 'Non intéressé', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'rappel', label: 'Rappel', color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { value: 'ferme', label: 'Fermé', color: 'bg-gray-100 text-gray-800 border-gray-200' },
];

export function StatusDropdown({ value, onChange, disabled }: StatusDropdownProps) {
  const currentStatus = statusOptions.find(option => option.value === value) || statusOptions[0];
  
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full border-none p-0 h-auto">
        <SelectValue asChild>
          <Badge className={`${currentStatus.color} hover:opacity-80 cursor-pointer`}>
            {currentStatus.label}
          </Badge>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {statusOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${option.color}`}></div>
              {option.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

