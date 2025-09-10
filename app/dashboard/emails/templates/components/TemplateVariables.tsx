"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  User,
  Building,
  Mail,
  Phone,
  Globe,
  Hash
} from 'lucide-react';

interface TemplateVariablesProps {
  onInsertVariable: (variable: string) => void;
}

const VARIABLE_GROUPS = [
  {
    title: 'Contact Information',
    icon: User,
    variables: [
      { key: '{{firstName}}', label: 'First Name', description: 'Prospect\'s first name' },
      { key: '{{lastName}}', label: 'Last Name', description: 'Prospect\'s last name' },
      { key: '{{fullName}}', label: 'Full Name', description: 'Prospect\'s full name' },
    ]
  },
  {
    title: 'Company Information',
    icon: Building,
    variables: [
      { key: '{{company}}', label: 'Company', description: 'Company name' },
      { key: '{{industry}}', label: 'Industry', description: 'Company industry' },
      { key: '{{website}}', label: 'Website', description: 'Company website' },
      { key: '{{companySize}}', label: 'Company Size', description: 'Company size' },
    ]
  },
  {
    title: 'Contact Details',
    icon: Mail,
    variables: [
      { key: '{{email}}', label: 'Email', description: 'Prospect\'s email address' },
      { key: '{{phone}}', label: 'Phone', description: 'Prospect\'s phone number' },
    ]
  },
  {
    title: 'Your Information',
    icon: User,
    variables: [
      { key: '{{userName}}', label: 'Your Name', description: 'Your full name' },
      { key: '{{userEmail}}', label: 'Your Email', description: 'Your email address' },
      { key: '{{userCompany}}', label: 'Your Company', description: 'Your company name' },
    ]
  }
];

export function TemplateVariables({ onInsertVariable }: TemplateVariablesProps) {
  const handleInsertVariable = (variable: string) => {
    onInsertVariable(variable);
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 mb-3">
        Click on any variable below to insert it into your template. These will be replaced with actual values when the template is used.
      </div>

      {VARIABLE_GROUPS.map((group) => (
        <div key={group.title} className="space-y-2">
          <div className="flex items-center gap-2">
            <group.icon className="w-4 h-4 text-gray-500" />
            <h4 className="font-medium text-gray-900 text-sm">{group.title}</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {group.variables.map((variable) => (
              <Button
                key={variable.key}
                variant="outline"
                size="sm"
                onClick={() => handleInsertVariable(variable.key)}
                className="justify-start text-left h-auto p-3"
                title={variable.description}
              >
                <div className="flex flex-col items-start gap-1">
                  <code className="text-xs bg-gray-100 px-1 py-0.5 rounded text-gray-800">
                    {variable.key}
                  </code>
                  <span className="text-xs text-gray-600">{variable.label}</span>
                </div>
              </Button>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-2">
          <Hash className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-800">
            <strong>Tip:</strong> Variables will be automatically replaced when you use this template with prospects.
            Make sure the prospect data includes the information you want to use.
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to get all available variables
export function getAvailableVariables(): string[] {
  return VARIABLE_GROUPS.flatMap(group =>
    group.variables.map(variable => variable.key)
  );
}

// Helper function to replace variables in content
export function replaceVariables(content: string, data: Record<string, string>): string {
  let result = content;

  VARIABLE_GROUPS.forEach(group => {
    group.variables.forEach(variable => {
      const key = variable.key;
      const value = data[key.replace(/\{\{/g, '').replace(/\}\}/g, '')] || '';
      result = result.replace(new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
    });
  });

  return result;
}

