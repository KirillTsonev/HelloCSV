import { Select, Badge, Input } from '../../components';
import {
  ColumnMapping,
  MapperOption,
  MapperOptionValue,
  SheetDefinition,
} from '../../types';
import {
  ArrowRightIcon,
  PencilIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'preact/hooks';
import { fieldIsRequired } from '../../validators';

interface Props {
  csvHeader: string;
  currentMapping: MapperOptionValue | null;
  setMapping: (header: MapperOptionValue | null) => void;
  mappingSelectionOptions: MapperOption[];
  onMouseEnter: () => void;
  sheetDefinitions: SheetDefinition[];
  onColumnLabelEdit: (
    sheetId: string,
    columnId: string,
    newLabel: string
  ) => void;
}

export default function HeaderMapperSelection({
  csvHeader,
  setMapping,
  currentMapping,
  mappingSelectionOptions,
  onMouseEnter,
  sheetDefinitions,
  onColumnLabelEdit,
}: Props) {
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [editedLabel, setEditedLabel] = useState('');

  const currentHeaderOption =
    currentMapping == null
      ? null
      : (mappingSelectionOptions.find(
          (option) =>
            option.value.sheetId === currentMapping.sheetId &&
            option.value.sheetColumnId === currentMapping.sheetColumnId
        )?.value ?? null);

  // Find the mapped column definition to check if it's required
  const mappedColumn =
    currentMapping == null
      ? null
      : (sheetDefinitions
          .find((sheet) => sheet.id === currentMapping.sheetId)
          ?.columns.find((col) => col.id === currentMapping.sheetColumnId) ??
        null);

  const isRequired = mappedColumn != null && fieldIsRequired(mappedColumn);
  const isOmitted = currentMapping?.sheetId === '__omit__';
  const canEditLabel = mappedColumn != null && !isRequired && !isOmitted;

  // Debug logging - always log to see what's happening
  console.log('HeaderMapperSelection Debug:', {
    csvHeader,
    currentMapping,
    mappedColumn: mappedColumn?.label,
    sheetDefinitionsCount: sheetDefinitions.length,
    sheetIds: sheetDefinitions.map((s) => s.id),
    foundSheet: currentMapping
      ? sheetDefinitions.find((sheet) => sheet.id === currentMapping.sheetId)
      : null,
    isRequired,
    isOmitted,
    canEditLabel,
  });

  const handleStartEdit = () => {
    if (mappedColumn) {
      setEditedLabel(mappedColumn.label);
      setIsEditingLabel(true);
    }
  };

  const handleSaveEdit = () => {
    if (currentMapping && editedLabel.trim() !== '') {
      onColumnLabelEdit(
        currentMapping.sheetId,
        currentMapping.sheetColumnId,
        editedLabel.trim()
      );
    }
    setIsEditingLabel(false);
  };

  const handleCancelEdit = () => {
    setIsEditingLabel(false);
    setEditedLabel('');
  };

  return (
    <div
      className="hover:bg-hello-csv-muted rounded-sm"
      onMouseEnter={onMouseEnter}
    >
      <div className="flex items-center py-2.5">
        <div className="mx-2.5 flex flex-1 justify-between">
          <div>
            <Badge>{csvHeader.slice(0, 30)}</Badge>
          </div>
          <div className="mx-5">
            <ArrowRightIcon className="h-4 w-4" />
          </div>
        </div>

        <div className="mx-2.5 flex flex-1 items-center gap-2">
          {isEditingLabel ? (
            <div className="flex flex-1 items-center gap-2">
              <div className="flex-1">
                <Input
                  value={editedLabel}
                  onChange={(value) => setEditedLabel(value as string)}
                  placeholder="Column label"
                  aria-label="Edit column label"
                />
              </div>
              <button
                onClick={handleSaveEdit}
                className="rounded p-1 text-green-600 hover:bg-green-50"
                aria-label="Save column label"
              >
                <CheckIcon className="h-5 w-5" />
              </button>
              <button
                onClick={handleCancelEdit}
                className="rounded p-1 text-gray-600 hover:bg-gray-100"
                aria-label="Cancel edit"
              >
                ×
              </button>
            </div>
          ) : (
            <>
              <div className="flex-1">
                <Select
                  aria-label={`column mapping for ${csvHeader}`}
                  searchable
                  clearable
                  compareFunction={(a, b) => {
                    if (a == null || b == null) {
                      return false;
                    }

                    return (
                      a.sheetColumnId === b.sheetColumnId &&
                      a.sheetId === b.sheetId
                    );
                  }}
                  value={currentHeaderOption}
                  options={mappingSelectionOptions}
                  onChange={(mapping) =>
                    setMapping(mapping as ColumnMapping | null)
                  }
                />
              </div>
              {canEditLabel && (
                <button
                  onClick={handleStartEdit}
                  className="rounded p-1 text-gray-600 hover:bg-gray-100"
                  aria-label="Edit column label"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
