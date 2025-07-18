"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PencilIcon } from "@heroicons/react/24/outline";
import type { UserProfile } from "../../types/user";
import Image from 'next/image';

interface ProfileCardProps {
  title: string;
  children: React.ReactNode;
  onEdit?: () => void;
}

const ProfileSectionCard: React.FC<ProfileCardProps> = ({ title, children, onEdit }) => (
  <Card className="bg-white shadow-sm rounded-xl overflow-hidden">
    <div className="p-3 md:p-4 flex justify-between items-center border-b border-gray-200">
      <h2 className="text-base md:text-lg font-semibold text-gray-800">{title}</h2>
      <Button variant="ghost" size="icon" onClick={onEdit} className="text-gray-500 hover:text-gray-800">
        <PencilIcon className="h-5 w-5" />
        <span className="sr-only">Edit</span>
      </Button>
    </div>
    <CardContent className="p-3 md:p-4">
      {children}
    </CardContent>
  </Card>
);

interface ProfileAvatarProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({ 
  src = "/default-avatar.png", 
  alt = "Profile picture", 
  size = 'md',
  className = "" 
}) => {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-24 h-24", 
    lg: "w-32 h-32"
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        className="rounded-full object-cover border border-gray-200"
        style={{ boxShadow: 'none' }}
      />
    </div>
  );
};

interface ProfileFieldProps {
  label: string;
  value?: string;
  icon?: React.ReactNode;
  isEditable?: boolean;
  type?: 'text' | 'email' | 'tel' | 'url' | 'textarea';
  placeholder?: string;
  onChange?: (value: string) => void;
}

const ProfileField: React.FC<ProfileFieldProps> = ({
  label,
  value = "",
  icon,
  isEditable = false,
  type = 'text',
  placeholder,
  onChange
}) => {
  if (type === 'textarea') {
    return (
      <div className="flex items-start gap-3">
        {icon && <div className="mt-1 text-gray-500">{icon}</div>}
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-700 mb-1">{label}</p>
          {isEditable ? (
            <textarea
              value={value}
              onChange={(e) => onChange?.(e.target.value)}
              className="w-full border rounded-md p-2 min-h-[80px] text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={placeholder}
            />
          ) : (
            <p className="text-gray-900 text-sm">{value || "Not provided"}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {icon && <div className="text-gray-500">{icon}</div>}
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-700 mb-1">{label}</p>
        {isEditable ? (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            className="w-full max-w-xs border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={placeholder}
          />
        ) : (
          <p className="text-gray-900 text-sm">{value || "Not provided"}</p>
        )}
      </div>
    </div>
  );
};

export { ProfileSectionCard, ProfileAvatar, ProfileField };
