import {
  NUMBER_OF_EXAMPLES_IN_MAPPING,
  MAX_CHARACTERS_IN_MAPPING_EXAMPLES,
} from '../constants';
import {
  ColumnMapping,
  CSVParsedData,
  MapperOptionValue,
  SheetDefinition,
} from '../types';
import { fieldIsRequired } from '../validators';
import { useTranslations } from '../i18';
import { normalizeValue } from '../utils';
import { allowUserToMapColumn } from '.';

function removeMappingDuplicates(mappings: ColumnMapping[]): ColumnMapping[] {
  const uniqueMap = new Map<string, ColumnMapping>();

  mappings.forEach((entry) => {
    if (!uniqueMap.has(entry.csvColumnName)) {
      uniqueMap.set(entry.csvColumnName, entry);
    }
  });

  return Array.from(uniqueMap.values());
}

function buildSheetSuggestedHeaderMappings(
  sheet: SheetDefinition,
  csvHeaders: string[]
): { mappings: ColumnMapping[]; newColumns: SheetDefinition['columns'] } {
  const mappings: ColumnMapping[] = [];
  const newColumns: SheetDefinition['columns'] = [];

  csvHeaders.forEach((header) => {
    const foundField = sheet.columns.find((column) => {
      if (!allowUserToMapColumn(column)) {
        return false;
      }

      const keywords = [
        column.id,
        ...(column.suggestedMappingKeywords || []),
      ].map((k) => normalizeValue(k));

      const normalizedHeader = normalizeValue(header);

      return keywords.includes(normalizedHeader);
    });

    if (!foundField) {
      const newColumnId = normalizeValue(header) ?? header.toLowerCase();
      const newColumn: SheetDefinition['columns'][number] = {
        id: newColumnId,
        label: header,
        type: 'string',
      };

      newColumns.push(newColumn);

      mappings.push({
        csvColumnName: header,
        sheetId: sheet.id,
        sheetColumnId: newColumnId,
      });

      return;
    }

    mappings.push({
      csvColumnName: header,
      sheetId: sheet.id,
      sheetColumnId: foundField.id,
    });
  });

  return { mappings, newColumns };
}

export const buildSuggestedHeaderMappings = (
  sheetDefinitions: SheetDefinition[],
  csvHeaders: string[]
): {
  mappings: ColumnMapping[];
  updatedSheetDefinitions: SheetDefinition[];
} => {
  const headerMappings: ColumnMapping[] = [];
  const updatedSheetDefinitions: SheetDefinition[] = [];

  sheetDefinitions.forEach((sheet) => {
    const result = buildSheetSuggestedHeaderMappings(sheet, csvHeaders);
    headerMappings.push(...result.mappings);

    if (result.newColumns.length > 0) {
      updatedSheetDefinitions.push({
        ...sheet,
        columns: [...sheet.columns, ...result.newColumns],
      });
    } else {
      updatedSheetDefinitions.push(sheet);
    }
  });

  return {
    mappings: removeMappingDuplicates(headerMappings),
    updatedSheetDefinitions,
  };
};

export function calculateNewMappingsForCsvColumnMapingChanged(
  currentMapping: ColumnMapping[],
  csvColumnName: string,
  newCsvColumnMaping: MapperOptionValue | null
): ColumnMapping[] {
  if (newCsvColumnMaping == null) {
    return currentMapping.filter((m) => m.csvColumnName !== csvColumnName);
  }

  if (
    newCsvColumnMaping.sheetId === '__omit__' &&
    newCsvColumnMaping.sheetColumnId === '__omit__'
  ) {
    const mappingsWithoutThisColumn = currentMapping.filter(
      (m) => m.csvColumnName !== csvColumnName
    );
    return [
      ...mappingsWithoutThisColumn,
      {
        csvColumnName,
        sheetId: '__omit__',
        sheetColumnId: '__omit__',
        omit: true,
      },
    ];
  }

  const mappingsForOtherSheets = currentMapping.filter(
    (m) =>
      (m.sheetId !== newCsvColumnMaping.sheetId ||
        m.sheetColumnId !== newCsvColumnMaping.sheetColumnId) &&
      m.csvColumnName !== csvColumnName
  );

  return [...mappingsForOtherSheets, { ...newCsvColumnMaping, csvColumnName }];
}

export function calculateMappingExamples(
  data: CSVParsedData[],
  csvColumnName: string
) {
  const examples = getFilteredExamples(data, csvColumnName);

  const paddedExamples = padExamples(examples);

  return trimExamplesByCharacterLimit(paddedExamples);
}

function getFilteredExamples(data: CSVParsedData[], csvColumnName: string) {
  return data
    .map((d) => d[csvColumnName])
    .filter((v) => v != null && v.trim() !== '')
    .slice(0, NUMBER_OF_EXAMPLES_IN_MAPPING);
}

function padExamples(examples: string[]) {
  const paddedExamples = [
    ...examples,
    ...Array(NUMBER_OF_EXAMPLES_IN_MAPPING - examples.length).fill(''),
  ];
  return paddedExamples;
}

function trimExamplesByCharacterLimit(examples: string[]) {
  const trimmedExamples = [...examples];
  let totalCharacters = trimmedExamples.reduce(
    (acc, curr) => acc + curr.length,
    0
  );

  while (
    totalCharacters > MAX_CHARACTERS_IN_MAPPING_EXAMPLES &&
    trimmedExamples.length > 1
  ) {
    trimmedExamples.pop();
    totalCharacters = trimmedExamples.reduce(
      (acc, curr) => acc + curr.length,
      0
    );
  }

  return trimmedExamples;
}

export function useMappingAvailableSelectOptions(
  sheetDefinitions: SheetDefinition[],
  currentMapping: ColumnMapping[]
) {
  const { t } = useTranslations();

  const omitOption = {
    label: t('mapper.omitColumn'),
    value: {
      sheetId: '__omit__',
      sheetColumnId: '__omit__',
    },
    group: '',
    className:
      'text-red-600 font-semibold bg-red-400 hover:bg-red-100 hello-csv-omit',
  };

  const options = sheetDefinitions.flatMap((sheetDefinition) =>
    sheetDefinition.columns
      .filter((column) => allowUserToMapColumn(column))
      .map((column) => ({
        label: `${column.label}${fieldIsRequired(column) ? ' *' : ''}`,
        value: {
          sheetId: sheetDefinition.id,
          sheetColumnId: column.id,
        },
        group: currentMapping.some(
          (mapping) =>
            mapping.sheetId === sheetDefinition.id &&
            mapping.sheetColumnId === column.id
        )
          ? t('mapper.used')
          : t('mapper.unused'),
      }))
  );

  const sortedOptions = options.sort((a, b) =>
    sortByGroupAndLabel(a, b, t('mapper.unused'))
  );

  return [omitOption, ...sortedOptions];
}

function sortByGroupAndLabel(
  a: { label: string; group: string },
  b: { label: string; group: string },
  unused: string
) {
  if (a.group === unused && b.group !== unused) {
    return -1;
  }
  if (a.group !== unused && b.group === unused) {
    return 1;
  }

  return a.label.localeCompare(b.label);
}

export function areAllRequiredMappingsSet(
  sheetDefinitions: SheetDefinition[],
  mappings: ColumnMapping[]
) {
  for (const sheet of sheetDefinitions) {
    for (const column of sheet.columns) {
      if (fieldIsRequired(column) && allowUserToMapColumn(column)) {
        const mapping = mappings.find(
          (m) => m.sheetId === sheet.id && m.sheetColumnId === column.id
        );

        if (mapping == null) {
          return false;
        }
      }
    }
  }

  return true;
}

export function filterSheetDefinitionsByMappings(
  sheetDefinitions: SheetDefinition[],
  mappings: ColumnMapping[]
): SheetDefinition[] {
  return sheetDefinitions.map((sheet) => {
    const filteredColumns = sheet.columns.filter((column) => {
      // Keep calculated and reference columns
      if (!allowUserToMapColumn(column)) {
        return true;
      }

      // Check if this column has a mapping and is not omitted
      const mapping = mappings.find(
        (m) =>
          m.sheetId === sheet.id && m.sheetColumnId === column.id && !m.omit
      );

      const keep = mapping != null;

      return keep;
    });

    return {
      ...sheet,
      columns: filteredColumns,
    };
  });
}
