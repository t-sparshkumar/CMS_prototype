import { useState } from 'react';
import InterfaceRenderer from './InterfaceRenderer';
import GroupFieldShell from './fields/GroupFieldShell';
import ResponsiveImageGroupField from './fields/ResponsiveImageGroupField';
import { buildFormFieldItems } from '../lib/responsiveImageFields';
import { colSpanClass, isGroupContainer, isPresentationalField } from '../lib/fieldUtils';
import type { FieldMeta, ItemRecord } from '../lib/api';

interface FieldFormLayoutProps {
  fields: FieldMeta[];
  formData: ItemRecord;
  onChange: (field: string, value: unknown) => void;
  fieldErrors?: Record<string, string>;
  parentId?: string;
  /** When set, only render fields belonging to this group */
  groupFilter?: string | null;
}

function GroupTabsContent({
  groupField,
  allFields,
  formData,
  onChange,
  fieldErrors,
  parentId,
}: {
  groupField: FieldMeta;
  allFields: FieldMeta[];
  formData: ItemRecord;
  onChange: (field: string, value: unknown) => void;
  fieldErrors?: Record<string, string>;
  parentId?: string;
}) {
  const tabFields = allFields
    .filter((f) => f.group === groupField.field && f.interface === 'group-tab')
    .sort((a, b) => a.sort - b.sort);

  const [activeTab, setActiveTab] = useState(tabFields[0]?.field ?? '');

  if (tabFields.length === 0) {
    return (
      <FieldFormLayout
        fields={allFields}
        formData={formData}
        onChange={onChange}
        fieldErrors={fieldErrors}
        parentId={parentId}
        groupFilter={groupField.field}
      />
    );
  }

  return (
    <>
      <div className="field-tab-bar border-b border-surface-border px-2 -mt-1 mb-3">
        {tabFields.map((tab) => (
          <button
            key={tab.field}
            type="button"
            onClick={() => setActiveTab(tab.field)}
            className={`field-tab ${activeTab === tab.field ? 'field-tab-active' : ''}`}
          >
            {tab.note ?? tab.field}
          </button>
        ))}
      </div>
      <FieldFormLayout
        fields={allFields}
        formData={formData}
        onChange={onChange}
        fieldErrors={fieldErrors}
        parentId={parentId}
        groupFilter={activeTab}
      />
    </>
  );
}

export default function FieldFormLayout({
  fields,
  formData,
  onChange,
  fieldErrors,
  parentId,
  groupFilter = null,
}: FieldFormLayoutProps) {
  const visibleFields = [...fields]
    .filter((f) => (groupFilter ? f.group === groupFilter : !f.group))
    .sort((a, b) => a.sort - b.sort);

  if (groupFilter && visibleFields.length === 0) {
    return (
      <p className="col-span-12 text-sm text-slate-400 italic">
        No fields in this tab yet.
      </p>
    );
  }

  const formItems = buildFormFieldItems(visibleFields);

  return (
    <div className="grid grid-cols-12 gap-4">
      {formItems.map((item) => {
        if (item.type === 'responsive-images') {
          return (
            <div key="responsive-images" className="col-span-12 flex flex-col">
              <ResponsiveImageGroupField
                values={formData}
                onChange={onChange}
              />
            </div>
          );
        }

        const field = item.field;
        if (isGroupContainer(field)) {
          return (
            <GroupFieldShell key={field.id} field={field}>
              {field.interface === 'group-tabs' ? (
                <GroupTabsContent
                  groupField={field}
                  allFields={fields}
                  formData={formData}
                  onChange={onChange}
                  fieldErrors={fieldErrors}
                  parentId={parentId}
                />
              ) : (
                <FieldFormLayout
                  fields={fields}
                  formData={formData}
                  onChange={onChange}
                  fieldErrors={fieldErrors}
                  parentId={parentId}
                  groupFilter={field.field}
                />
              )}
            </GroupFieldShell>
          );
        }

        const spanClass =
          isPresentationalField(field) || field.interface === 'divider'
            ? 'col-span-12'
            : field.interface === 'repeater' ||
                field.type === 'json' ||
                field.interface === 'input-code' ||
                field.interface === 'block-editor' ||
                field.interface === 'wysiwyg' ||
                field.type === 'text'
              ? 'col-span-12'
              : colSpanClass(field.width, field);

        return (
          <div key={field.id} className={`${spanClass} flex flex-col`}>
            <InterfaceRenderer
              field={field}
              value={formData[field.field]}
              formData={formData}
              parentId={parentId}
              onChange={(value) => onChange(field.field, value)}
            />
            {fieldErrors?.[field.field] && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors[field.field]}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
