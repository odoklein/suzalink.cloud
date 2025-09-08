import { useState } from "react";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface RappelDatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  disabled?: boolean;
}

export function RappelDatePicker({ value, onChange, disabled }: RappelDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dateInput, setDateInput] = useState(
    value ? value.toISOString().split('T')[0] : ""
  );
  const [timeInput, setTimeInput] = useState(
    value ? value.toTimeString().slice(0, 5) : "09:00"
  );

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleConfirm = () => {
    if (dateInput && timeInput) {
      const [hours, minutes] = timeInput.split(':').map(Number);
      const combinedDateTime = new Date(dateInput);
      combinedDateTime.setHours(hours, minutes, 0, 0);
      onChange(combinedDateTime);
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    setDateInput("");
    setTimeInput("09:00");
    onChange(undefined);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={`w-full justify-start text-left font-normal p-1 h-auto ${
            !value && "text-muted-foreground"
          }`}
          disabled={disabled}
        >
          {value ? (
            <Badge variant="outline" className="gap-1">
              <CalendarIcon className="h-3 w-3" />
              {formatDate(value)}
            </Badge>
          ) : (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarIcon className="h-3 w-3" />
              Rappel
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Date</label>
            <Input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Heure</label>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Input
                type="time"
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                className="w-32"
              />
            </div>
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={!dateInput}
            >
              Confirmer
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleClear}
            >
              Effacer
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}