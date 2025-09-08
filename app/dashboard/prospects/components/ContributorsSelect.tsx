import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, X, Check, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface User {
  id: string;
  name: string;
  email: string;
}

interface ContributorsSelectProps {
  value?: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}

// Generate gradient background based on first letter
const getAvatarGradient = (name: string) => {
  const gradients = [
    'bg-gradient-to-br from-blue-400 to-blue-600',
    'bg-gradient-to-br from-green-400 to-green-600',
    'bg-gradient-to-br from-purple-400 to-purple-600',
    'bg-gradient-to-br from-pink-400 to-pink-600',
    'bg-gradient-to-br from-yellow-400 to-yellow-600',
    'bg-gradient-to-br from-red-400 to-red-600',
    'bg-gradient-to-br from-indigo-400 to-indigo-600',
    'bg-gradient-to-br from-teal-400 to-teal-600',
    'bg-gradient-to-br from-orange-400 to-orange-600',
    'bg-gradient-to-br from-cyan-400 to-cyan-600',
  ];

  const firstChar = name.charAt(0).toUpperCase();
  const index = firstChar.charCodeAt(0) % gradients.length;
  return gradients[index];
};

export function ContributorsSelect({ value = [], onChange, disabled }: ContributorsSelectProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/users");

        if (!response.ok) {
          console.error("API Error:", response.status, response.statusText);
          return;
        }

        const data = await response.json();

        if (Array.isArray(data)) {
          setUsers(data);
        } else {
          console.error("Invalid data format:", data);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleUserToggle = (userId: string, event?: React.MouseEvent) => {
    // Prevent event bubbling to avoid closing the popover
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (value.includes(userId)) {
      onChange(value.filter(id => id !== userId));
    } else {
      onChange([...value, userId]);
    }
  };

  const handleRemoveContributor = (userId: string) => {
    onChange(value.filter(id => id !== userId));
  };

  const selectedUsers = users.filter(user => value.includes(user.id));

  return (
    <div className="space-y-2">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between border-slate-200 hover:bg-slate-50 transition-colors duration-200"
            disabled={disabled || loading}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {selectedUsers.length > 0 ? (
                <div className="flex items-center gap-1">
                  {selectedUsers.slice(0, 3).map((user, index) => (
                    <Avatar key={user.id} className="h-5 w-5 -ml-1 first:ml-0 border border-white">
                      <AvatarFallback className={`text-xs font-medium text-white ${getAvatarGradient(user.name)}`}>
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {selectedUsers.length > 3 && (
                    <span className="text-xs text-slate-500 ml-1">+{selectedUsers.length - 3}</span>
                  )}
                </div>
              ) : (
                <Users className="h-4 w-4 text-slate-400" />
              )}
              <span className="truncate text-left">
                {value.length === 0
                  ? "Sélectionner des contributeurs"
                  : `${value.length} contributeur${value.length > 1 ? 's' : ''} sélectionné${value.length > 1 ? 's' : ''}`
                }
              </span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-80 p-0 shadow-lg border border-slate-200"
          align="start"
          sideOffset={4}
        >
          <div
            className="max-h-64 overflow-y-auto"
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="p-2">
              {loading ? (
                <div className="flex items-center justify-center p-6">
                  <div className="text-sm text-slate-500 animate-pulse">Chargement des utilisateurs...</div>
                </div>
              ) : users.length === 0 ? (
                <div className="flex items-center justify-center p-6">
                  <div className="text-sm text-slate-500">Aucun utilisateur trouvé</div>
                </div>
              ) : (
                users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center space-x-3 p-3 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors duration-150 group"
                    onClick={(e) => handleUserToggle(user.id, e)}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <div className="flex-shrink-0">
                      {value.includes(user.id) ? (
                        <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 border-2 border-slate-200 rounded group-hover:border-slate-300 transition-colors" />
                      )}
                    </div>
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className={`text-sm font-medium text-white ${getAvatarGradient(user.name)}`}>
                        {user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-slate-900 truncate">{user.name}</div>
                      <div className="text-xs text-slate-500 truncate">{user.email}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Selected contributors display */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedUsers.map((user) => (
            <Badge
              key={user.id}
              variant="default"
              className="bg-slate-50 text-slate-700 border-slate-200 px-2 py-1 hover:bg-slate-100 transition-colors duration-150 text-xs h-6"
            >
              <div className="flex items-center gap-1.5">
                <Avatar className="h-3.5 w-3.5 flex-shrink-0">
                  <AvatarFallback className={`text-[10px] font-semibold text-white ${getAvatarGradient(user.name)}`}>
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium truncate max-w-20">{user.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveContributor(user.id);
                  }}
                  className="ml-0.5 hover:bg-slate-200 rounded-full p-0.5 transition-colors flex-shrink-0"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
