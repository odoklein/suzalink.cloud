import * as React from "react"
import { Circle } from "lucide-react"

import { cn } from "@/lib/utils"

interface RadioGroupProps {
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  children: React.ReactNode
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value, onValueChange, children, ...props }, ref) => {
    const [selectedValue, setSelectedValue] = React.useState(value || "")

    const handleValueChange = (newValue: string) => {
      setSelectedValue(newValue)
      onValueChange?.(newValue)
    }

    React.useEffect(() => {
      if (value !== undefined) {
        setSelectedValue(value)
      }
    }, [value])

    return (
      <div
        ref={ref}
        className={cn("grid gap-2", className)}
        {...props}
      >
        {React.Children.map(children, (child) =>
          React.isValidElement(child)
            ? React.cloneElement(child as React.ReactElement<any>, {
                selectedValue,
                onValueChange: handleValueChange,
              })
            : child
        )}
      </div>
    )
  }
)
RadioGroup.displayName = "RadioGroup"

interface RadioGroupItemProps {
  value: string
  selectedValue?: string
  onValueChange?: (value: string) => void
  className?: string
  id?: string
  children?: React.ReactNode
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, selectedValue, onValueChange, ...props }, ref) => {
    const isSelected = selectedValue === value

    return (
      <div className="flex items-center space-x-2">
        <input
          ref={ref}
          type="radio"
          value={value}
          checked={isSelected}
          onChange={() => onValueChange?.(value)}
          className={cn(
            "aspect-square h-4 w-4 rounded-full border border-gray-300 text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center">
            {isSelected && (
              <Circle className="h-2.5 w-2.5 fill-current text-blue-600" />
            )}
          </div>
        </div>
      </div>
    )
  }
)
RadioGroupItem.displayName = "RadioGroupItem"

export { RadioGroup, RadioGroupItem }
