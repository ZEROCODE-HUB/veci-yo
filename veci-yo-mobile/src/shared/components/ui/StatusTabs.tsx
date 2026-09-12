import React from 'react';
import { Tabs, STATUS_COLORS } from './Tabs';

interface StatusTabsProps {
  tabs: (string | { value: string; label: string })[];
  active: string | null;
  onChange: (val: string | null) => void;
  centered?: boolean;
  statusColors?: Record<string, { bg: string; color: string }>;
}

export function StatusTabs({
  tabs,
  active,
  onChange,
  centered = false,
  statusColors = {},
}: StatusTabsProps) {
  return (
    <Tabs
      tabs={tabs}
      active={active}
      onChange={onChange}
      variant="status"
      statusColors={statusColors}
      centered={centered}
    />
  );
}
