"use client";

import { Button } from "@/components/ui/button";

interface ProfileCardProps {
  title: string;
  children: React.ReactNode;
  onEdit?: () => void;
}

const ProfileSectionCard: React.FC<ProfileCardProps> = ({ title, children, onEdit }) => (
  <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow duration-300">
    <div className="p-6 border-b border-gray-200/60 bg-gradient-to-r from-gray-50/50 to-white">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {onEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
          >
            Edit
          </Button>
        )}
      </div>
    </div>
    <div className="p-6">
      {children}
    </div>
  </div>
);

export { ProfileSectionCard };
