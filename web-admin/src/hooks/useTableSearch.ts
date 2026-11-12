import { useMemo, useState } from 'react';

export const SEARCH_MIN_LENGTH = 3;

function normalize(value: unknown): string {
  if (value == null) {
    return '';
  }

  if (typeof value === 'string') {
    return value.toLowerCase();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(normalize).join(' ');
  }

  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .map(normalize)
      .join(' ');
  }

  return '';
}

export function useTableSearch<T>(rows: T[]) {
  const [searchValue, setSearchValue] = useState('');
  const term = searchValue.trim().toLowerCase();
  const isSearchActive = term.length >= SEARCH_MIN_LENGTH;

  const filteredRows = useMemo(() => {
    if (!isSearchActive) {
      return rows;
    }

    return rows.filter((row) => normalize(row).includes(term));
  }, [rows, term, isSearchActive]);

  return { searchValue, setSearchValue, filteredRows, isSearchActive };
}
