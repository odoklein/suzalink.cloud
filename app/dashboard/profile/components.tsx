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
  <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300">
    <div className="p-4 md:p-6 flex justify-between items-center border-b border-gray-100 bg-gradient-to-r from-gray-50 to-gray-100/50">
      <h2 className="text-lg md:text-xl font-semibold text-gray-900 flex items-center gap-2">
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        {title}
      </h2>
      {onEdit && (
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onEdit} 
          className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-200"
        >
          <PencilIcon className="h-5 w-5" />
          <span className="sr-only">Edit</span>
        </Button>
      )}
    </div>
    <CardContent className="p-4 md:p-6">
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
        className="rounded-2xl object-cover border-2 border-white shadow-xl"
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
      <div className="flex items-start gap-4 group">
        {icon && (
          <div className="mt-2 p-2 bg-gray-50 rounded-lg text-gray-500 group-hover:text-blue-600 transition-colors duration-200">
            {icon}
          </div>
        )}
        <div className="flex-1 space-y-2">
          <p className="text-sm font-semibold text-gray-700">{label}</p>
          {isEditable ? (
            <textarea
              value={value}
              onChange={(e) => onChange?.(e.target.value)}
              className="w-full border border-gray-200 rounded-xl p-3 min-h-[100px] text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
              placeholder={placeholder}
            />
          ) : (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-gray-900 text-sm leading-relaxed">
                {value || (
                  <span className="text-gray-400 italic">Not provided</span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 group">
      {icon && (
        <div className="p-2 bg-gray-50 rounded-lg text-gray-500 group-hover:text-blue-600 transition-colors duration-200">
          {icon}
        </div>
      )}
      <div className="flex-1 space-y-2">
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        {isEditable ? (
          <input
            type={type}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            className="w-full max-w-md border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 backdrop-blur-sm"
            placeholder={placeholder}
          />
        ) : (
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-gray-900 text-sm">
              {value || (
                <span className="text-gray-400 italic">Not provided</span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export { ProfileSectionCard, ProfileAvatar, ProfileField };
