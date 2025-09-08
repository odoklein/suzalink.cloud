"use client";
import { Button } from "@/components/ui/button";
import { X, Users, Building, Mail, MapPin, Calendar } from "lucide-react";
import { useQueryClient } from '@tanstack/react-query';

interface Client {
  id: string;
  name: string;
  contact_email: string;
  company: string | null;
  status: 'active' | 'pending' | 'inactive';
  region: string | null;
  created_at: string;
}

interface ClientSidePanelProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusColors = {
  active: 'bg-green-100 text-green-800 border-green-200',
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  inactive: 'bg-gray-100 text-gray-800 border-gray-200'
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[status as keyof typeof statusColors]}`}>
    {status === 'active' ? 'Actif' : 
     status === 'pending' ? 'En attente' : 
     status === 'inactive' ? 'Inactif' : status}
  </span>
);

export default function ClientSidePanel({ client, isOpen, onClose }: ClientSidePanelProps) {
  const queryClient = useQueryClient();


  if (!client) return null;

  return (
    <>
                    {/* Overlay */}
       <div 
         className={`fixed inset-0 bg-black transition-all duration-500 ease-in-out z-40 ${
           isOpen ? 'opacity-20' : 'opacity-0 pointer-events-none'
         }`}
         onClick={onClose}
       />
       
       {/* Side Panel */}
       <div 
         className={`fixed right-0 top-0 h-full w-96 bg-white shadow-2xl transform transition-all duration-300 ease-in-out z-50 ${
           isOpen ? 'translate-x-0' : 'translate-x-full'
         }`}
       >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Client Details</h2>
            <p className="text-sm text-gray-600">View client information</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

         {/* Content */}
         <div className="h-full overflow-y-auto">
           <div className="p-6 space-y-6">
             {/* Client Info Card */}
             <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
               <div className="flex items-start justify-between mb-6">
                 <div className="flex-1">
                   <h3 className="text-xl font-semibold text-gray-900 mb-2">{client.name}</h3>
                   <StatusBadge status={client.status} />
                 </div>
               </div>
               
               <div className="space-y-4">
                 {/* Email */}
                 <div className="flex items-center gap-3">
                   <Mail className="w-5 h-5 text-gray-400 flex-shrink-0" />
                   <div className="flex-1">
                     <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Email</p>
                     <p className="text-sm text-gray-900">{client.contact_email}</p>
                   </div>
                 </div>

                 {/* Company */}
                 <div className="flex items-center gap-3">
                   <Building className="w-5 h-5 text-gray-400 flex-shrink-0" />
                   <div className="flex-1">
                     <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Company</p>
                     <p className="text-sm text-gray-900">{client.company || "Not specified"}</p>
                   </div>
                 </div>

                 {/* Region */}
                 <div className="flex items-center gap-3">
                   <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0" />
                   <div className="flex-1">
                     <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Region</p>
                     <p className="text-sm text-gray-900">{client.region || "Not specified"}</p>
                   </div>
                 </div>

                 {/* Created Date */}
                 <div className="flex items-center gap-3">
                   <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0" />
                   <div className="flex-1">
                     <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Created</p>
                     <p className="text-sm text-gray-900">
                       {new Date(client.created_at).toLocaleDateString('en-US', {
                         year: 'numeric',
                         month: 'long',
                         day: 'numeric'
                       })}
                     </p>
                   </div>
                 </div>
               </div>
             </div>

             {/* Quick Actions */}
             <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
               <h4 className="text-base font-medium text-gray-900 mb-4">Quick Actions</h4>
               <div className="space-y-3">
                 <Button 
                   variant="outline" 
                   className="w-full justify-start rounded-xl"
                   onClick={() => {/* TODO: Navigate to projects */}}
                 >
                   <Users className="w-4 h-4 mr-3" />
                   View Projects
                 </Button>
                 <Button 
                   variant="outline" 
                   className="w-full justify-start rounded-xl"
                   onClick={() => {/* TODO: Send email */}}
                 >
                   <Mail className="w-4 h-4 mr-3" />
                   Send Email
                 </Button>
                 <Button 
                   variant="outline" 
                   className="w-full justify-start rounded-xl"
                   onClick={() => {/* TODO: View invoices */}}
                 >
                   <Building className="w-4 h-4 mr-3" />
                   View Invoices
                 </Button>
               </div>
             </div>
           </div>
         </div>
       </div>
    </>
  );
} 