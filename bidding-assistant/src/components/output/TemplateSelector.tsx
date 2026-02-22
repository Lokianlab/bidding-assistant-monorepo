"use client";

import { getBuiltinTemplates } from "@/lib/output/template-manager";
import type { DocumentTemplate } from "@/lib/output/types";

interface TemplateSelectorProps {
  selectedId: string;
  customTemplates?: DocumentTemplate[];
  onChange: (id: string) => void;
}

export function TemplateSelector({
  selectedId,
  customTemplates = [],
  onChange,
}: TemplateSelectorProps) {
  const builtinTemplates = getBuiltinTemplates();
  const allTemplates = [...builtinTemplates, ...customTemplates.filter((c) => c.id !== "custom")];

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground mb-2">選擇範本</p>
      {allTemplates.map((template) => (
        <button
          key={template.id}
          onClick={() => onChange(template.id)}
          className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
            selectedId === template.id
              ? "bg-primary text-primary-foreground"
              : "hover:bg-accent text-foreground"
          }`}
        >
          <div className="font-medium">{template.name}</div>
          <div
            className={`text-xs mt-0.5 ${
              selectedId === template.id
                ? "text-primary-foreground/70"
                : "text-muted-foreground"
            }`}
          >
            {template.description}
          </div>
        </button>
      ))}
    </div>
  );
}
