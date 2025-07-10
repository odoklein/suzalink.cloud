import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = {
  default: "bg-gray-100 text-gray-700",
  inProgress: "bg-purple-100 text-purple-700",
  high: "bg-pink-100 text-pink-700",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-blue-100 text-blue-700",
  review: "bg-orange-100 text-orange-700",
  draft: "bg-gray-200 text-gray-600",
  // Add more as needed
};

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  variant?: keyof typeof badgeVariants;
};

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors shadow-sm border border-transparent",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  )
);
Badge.displayName = "Badge";

export { Badge, badgeVariants }; 