'use client';

import { useState } from 'react';
import { Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface TimePickerProps {
  value: string; // Format: "HH:mm"
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TimePicker({ value, onChange, disabled }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Parse current value or default to 12:00
  const [hours, minutes] = value ? value.split(':').map(Number) : [12, 0];

  const setTime = (newHours: number, newMinutes: number) => {
    const formattedTime = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
    onChange(formattedTime);
  };

  const handleHourChange = (newHour: number) => {
    setTime(newHour, minutes);
  };

  const handleMinuteChange = (newMinute: number) => {
    setTime(hours, newMinute);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal"
          disabled={disabled}
        >
          <Clock className="mr-2 h-4 w-4" />
          {value || 'Select time'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4 space-y-4">
          <div className="text-sm font-medium text-center">Select Time</div>

          <div className="flex gap-2 items-center justify-center">
            {/* Hours */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground block text-center">
                Hour
              </label>
              <Input
                type="number"
                min="0"
                max="23"
                value={hours}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (val >= 0 && val <= 23) {
                    handleHourChange(val);
                  }
                }}
                className="w-16 text-center"
              />
              <div className="grid grid-cols-4 gap-1">
                {[0, 6, 12, 18].map((h) => (
                  <Button
                    key={h}
                    variant={hours === h ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleHourChange(h)}
                    className="h-8 w-8 p-0 text-xs"
                  >
                    {String(h).padStart(2, '0')}
                  </Button>
                ))}
              </div>
            </div>

            <div className="text-2xl font-bold">:</div>

            {/* Minutes */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground block text-center">
                Minute
              </label>
              <Input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (val >= 0 && val <= 59) {
                    handleMinuteChange(val);
                  }
                }}
                className="w-16 text-center"
              />
              <div className="grid grid-cols-4 gap-1">
                {[0, 15, 30, 45].map((m) => (
                  <Button
                    key={m}
                    variant={minutes === m ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleMinuteChange(m)}
                    className="h-8 w-8 p-0 text-xs"
                  >
                    {String(m).padStart(2, '0')}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTime(new Date().getHours(), new Date().getMinutes())}
              className="flex-1"
            >
              Now
            </Button>
            <Button
              size="sm"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
