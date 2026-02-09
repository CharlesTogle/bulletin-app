'use client';

import { useState, useEffect } from 'react';
import { getGroupTags, Tag } from '@/actions/tags';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Filter, SortAsc, SortDesc, X } from 'lucide-react';

export interface AnnouncementFilterState {
  sortBy: 'created_at' | 'deadline';
  sortOrder: 'asc' | 'desc';
  tagId?: string;
}

interface AnnouncementFiltersProps {
  groupId: string;
  filters: AnnouncementFilterState;
  onFiltersChange: (filters: AnnouncementFilterState) => void;
}

export function AnnouncementFilters({
  groupId,
  filters,
  onFiltersChange,
}: AnnouncementFiltersProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTags();
  }, [groupId]);

  async function loadTags() {
    setLoading(true);
    try {
      const result = await getGroupTags(groupId);
      if (result.success && result.data) {
        setTags(result.data);
      }
    } finally {
      setLoading(false);
    }
  }

  function handleSortChange(value: string) {
    const [sortBy, sortOrder] = value.split('-') as ['created_at' | 'deadline', 'asc' | 'desc'];
    onFiltersChange({ ...filters, sortBy, sortOrder });
  }

  function handleTagFilter(tagId: string) {
    onFiltersChange({ ...filters, tagId });
  }

  function clearTagFilter() {
    const { tagId, ...rest } = filters;
    onFiltersChange(rest);
  }

  const selectedTag = tags.find((t) => t.id === filters.tagId);
  const sortValue = `${filters.sortBy}-${filters.sortOrder}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Sort Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            {filters.sortOrder === 'asc' ? (
              <SortAsc className="h-4 w-4" />
            ) : (
              <SortDesc className="h-4 w-4" />
            )}
            Sort: {filters.sortBy === 'created_at' ? 'Date Created' : 'Deadline'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Sort By</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup value={sortValue} onValueChange={handleSortChange}>
            <DropdownMenuRadioItem value="created_at-desc">
              Newest First
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="created_at-asc">
              Oldest First
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="deadline-asc">
              Deadline (Soonest)
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="deadline-desc">
              Deadline (Latest)
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Tag Filter Dropdown */}
      {tags.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              {selectedTag ? (
                <span className="flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: selectedTag.color }}
                  />
                  {selectedTag.title}
                </span>
              ) : (
                'Filter by Tag'
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
            <DropdownMenuLabel>Filter by Tag</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleTagFilter(tag.id)}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-sm hover:bg-muted rounded"
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="flex-1 text-left">{tag.title}</span>
                {tag.usage_count !== undefined && (
                  <Badge variant="secondary" className="text-xs">
                    {tag.usage_count}
                  </Badge>
                )}
              </button>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Active Tag Filter Badge */}
      {selectedTag && (
        <Badge
          variant="outline"
          className="gap-1 cursor-pointer hover:bg-destructive/10"
          style={{ borderColor: selectedTag.color }}
          onClick={clearTagFilter}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: selectedTag.color }}
          />
          {selectedTag.title}
          <X className="h-3 w-3 ml-1" />
        </Badge>
      )}
    </div>
  );
}
