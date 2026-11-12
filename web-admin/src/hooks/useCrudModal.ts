import { useState } from 'react';

export interface CrudModalState<T> {
  open: boolean;
  editing: T | null;
  openCreate: () => void;
  openEdit: (item: T) => void;
  close: () => void;
}

export function useCrudModal<T>(): CrudModalState<T> {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);

  return {
    open,
    editing,
    openCreate: () => {
      setEditing(null);
      setOpen(true);
    },
    openEdit: (item: T) => {
      setEditing(item);
      setOpen(true);
    },
    close: () => {
      setOpen(false);
      setEditing(null);
    },
  };
}
