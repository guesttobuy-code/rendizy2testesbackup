import React, { useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { X, Plus, Tag } from 'lucide-react';
import { cn } from '../ui/utils';

interface TagsManagerProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  availableTags?: string[];
  maxTags?: number;
  className?: string;
  readonly?: boolean;
}

export function TagsManager({
  tags,
  onTagsChange,
  availableTags = [],
  maxTags = 10,
  className,
  readonly = false,
}: TagsManagerProps) {
  const [newTag, setNewTag] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    
    const tag = newTag.trim().toLowerCase();
    
    if (tags.includes(tag)) {
      setNewTag('');
      return;
    }

    if (tags.length >= maxTags) {
      return;
    }

    onTagsChange([...tags, tag]);
    setNewTag('');
    setShowInput(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(t => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === 'Escape') {
      setShowInput(false);
      setNewTag('');
    }
  };

  const filteredAvailableTags = availableTags.filter(tag => !tags.includes(tag));

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2 flex-wrap">
        {tags.map(tag => (
          <Badge
            key={tag}
            variant="secondary"
            className="flex items-center gap-1"
          >
            <Tag className="w-3 h-3" />
            {tag}
            {!readonly && (
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </Badge>
        ))}
        
        {!readonly && tags.length < maxTags && (
          <>
            {!showInput ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInput(true)}
                className="h-6 text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Adicionar tag
              </Button>
            ) : (
              <div className="flex items-center gap-1">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={() => {
                    if (!newTag.trim()) {
                      setShowInput(false);
                    }
                  }}
                  placeholder="Nova tag..."
                  className="h-6 text-xs w-32"
                  autoFocus
                />
                {filteredAvailableTags.length > 0 && (
                  <div className="absolute z-10 mt-8 bg-white dark:bg-gray-800 border rounded shadow-lg p-2 max-h-40 overflow-y-auto">
                    {filteredAvailableTags.slice(0, 5).map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setNewTag(tag);
                          handleAddTag();
                        }}
                        className="block w-full text-left px-2 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
      
      {availableTags.length > 0 && !readonly && (
        <div className="text-xs text-gray-500">
          Tags sugeridas: {filteredAvailableTags.slice(0, 3).join(', ')}
          {filteredAvailableTags.length > 3 && '...'}
        </div>
      )}
    </div>
  );
}

