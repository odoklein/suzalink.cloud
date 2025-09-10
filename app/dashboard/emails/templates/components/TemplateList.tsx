"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Edit,
  Trash2,
  Copy,
  Eye,
  Calendar,
  User,
  Tag
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  created_at: string;
  updated_at: string;
  email_template_categories?: EmailTemplateCategory;
}

interface EmailTemplateCategory {
  id: string;
  name: string;
  color: string;
  is_default: boolean;
}

interface TemplateListProps {
  templates: EmailTemplate[];
  categories: EmailTemplateCategory[];
  viewMode: 'grid' | 'list';
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
  selectedTemplates: Set<string>;
  onTemplateSelect: (templateId: string, isSelected: boolean) => void;
  onEdit: (template: EmailTemplate) => void;
  onDelete: (templateId: string) => void;
}

export function TemplateList({
  templates,
  categories,
  viewMode,
  selectedCategory,
  onCategoryChange,
  selectedTemplates,
  onTemplateSelect,
  onEdit,
  onDelete
}: TemplateListProps) {
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: fr
      });
    } catch {
      return 'Date inconnue';
    }
  };

  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const CategoryFilter = () => (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Tag className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-gray-700">Categories</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onCategoryChange('all')}
          className="text-xs"
        >
          All Templates
        </Button>
        <Button
          variant={selectedCategory === 'uncategorized' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onCategoryChange('uncategorized')}
          className="text-xs"
        >
          Uncategorized
        </Button>
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => onCategoryChange(category.id)}
            className="text-xs flex items-center gap-1"
          >
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            {category.name}
          </Button>
        ))}
      </div>
    </div>
  );

  const getCategoryInfo = (template: EmailTemplate) => {
    if (template.email_template_categories) {
      return template.email_template_categories;
    }
    return null;
  };

  const TemplateCard = ({ template }: { template: EmailTemplate }) => (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={selectedTemplates.has(template.id)}
              onChange={(e) => onTemplateSelect(template.id, e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 mt-1"
            />
            <div className="p-2 bg-blue-50 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 truncate">
                {template.name}
              </h3>
              <p className="text-sm text-gray-600 truncate mt-1">
                {template.subject}
              </p>
              {(() => {
                const category = getCategoryInfo(template);
                return category ? (
                  <span
                    className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors shadow-sm border mt-2"
                    style={{
                      borderColor: category.color,
                      color: category.color,
                      backgroundColor: `${category.color}20`
                    }}
                  >
                    {category.name}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors shadow-sm border mt-2 bg-gray-100 text-gray-700">
                    Uncategorized
                  </span>
                );
              })()}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-700 leading-relaxed">
            {truncateText(template.content.replace(/<[^>]*>/g, ''))}
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>Créé {formatDate(template.created_at)}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full" title="Shared with all users"></div>
            <span className="text-green-600 font-medium">Shared</span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(template)}
            className="flex-1"
          >
            <Edit className="w-3 h-3 mr-1" />
            Modifier
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(template.id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const TemplateListItem = ({ template }: { template: EmailTemplate }) => (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <input
              type="checkbox"
              checked={selectedTemplates.has(template.id)}
              onChange={(e) => onTemplateSelect(template.id, e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            />
            <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900 truncate">
                {template.name}
              </h3>
              <p className="text-sm text-gray-600 truncate">
                {template.subject}
              </p>
              <p className="text-xs text-gray-500 truncate mt-1">
                {truncateText(template.content.replace(/<[^>]*>/g, ''), 100)}
              </p>
              {(() => {
                const category = getCategoryInfo(template);
                return category ? (
                  <span
                    className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors shadow-sm border mt-2"
                    style={{
                      borderColor: category.color,
                      color: category.color,
                      backgroundColor: `${category.color}20`
                    }}
                  >
                    {category.name}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors shadow-sm border mt-2 bg-gray-100 text-gray-700">
                    Uncategorized
                  </span>
                );
              })()}
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(template.created_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" title="Shared with all users"></div>
                <span className="text-green-600 font-medium">Shared</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(template)}
            >
              <Edit className="w-3 h-3 mr-1" />
              Modifier
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(template.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div>
      <CategoryFilter />
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <TemplateListItem key={template.id} template={template} />
          ))}
        </div>
      )}
    </div>
  );
}
