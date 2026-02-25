import type {
  FilterCondition,
  FilterPropertyType,
  FilterOperator,
  CaseBoardFilterSettings,
} from './types';
import { DEFAULT_FIELD_MAP } from '@/lib/constants/field-mapping';
import type { FieldMappingKey } from '@/lib/constants/field-mapping';

/** 每個可篩選欄位的 Notion property type */
export const FIELD_TYPE_MAP: Partial<Record<FieldMappingKey, FilterPropertyType>> = {
  名稱:     'rich_text',
  進程:     'status',
  決策:     'select',
  截標:     'date',
  預算:     'number',
  招標機關: 'rich_text',
  案號:     'rich_text',
  標案類型: 'multi_select',
  評選日期: 'date',
  押標金:   'number',
  領標費:   'number',
  電子投標: 'checkbox',
  確定協作: 'checkbox',
  備標期限: 'date',
  投遞序位: 'select',
  評審方式: 'select',
  企劃主筆: 'multi_select',
  進度:     'multi_select',
  標籤:     'multi_select',
};

/** 各 type 可用的 operator 清單 */
export const OPERATORS_BY_TYPE: Record<FilterPropertyType, FilterOperator[]> = {
  checkbox:     ['equals'],
  status:       ['equals', 'does_not_equal'],
  select:       ['equals', 'does_not_equal', 'is_empty', 'is_not_empty'],
  multi_select: ['contains', 'does_not_contain', 'is_empty', 'is_not_empty'],
  date:         ['before', 'after', 'on_or_before', 'on_or_after', 'is_empty', 'is_not_empty'],
  number:       ['equals', 'does_not_equal', 'greater_than', 'less_than',
                 'greater_than_or_equal_to', 'less_than_or_equal_to', 'is_empty', 'is_not_empty'],
  rich_text:    ['contains', 'does_not_contain', 'equals', 'is_empty', 'is_not_empty'],
};

/** Operator 中文顯示名稱 */
export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  equals:                    '等於',
  does_not_equal:            '不等於',
  contains:                  '包含',
  does_not_contain:          '不包含',
  is_empty:                  '為空',
  is_not_empty:              '不為空',
  before:                    '早於',
  after:                     '晚於',
  on_or_before:              '不晚於',
  on_or_after:               '不早於',
  greater_than:              '大於',
  less_than:                 '小於',
  greater_than_or_equal_to:  '大於等於',
  less_than_or_equal_to:     '小於等於',
};

/** 不需要填值的 operator */
export const NO_VALUE_OPERATORS: FilterOperator[] = ['is_empty', 'is_not_empty'];

/** 預設篩選：確定協作 = true（與原本寫死行為一致） */
export const DEFAULT_CASE_BOARD_FILTER: CaseBoardFilterSettings = {
  logic: 'and',
  conditions: [
    { id: 'default-1', property: '確定協作', operator: 'equals', value: true },
  ],
};

/**
 * 將 CaseBoardFilterSettings 轉換為 Notion API filter 物件。
 * 回傳值可直接傳入 Notion query 的 `filter` 參數。
 */
export function buildNotionFilter(settings: CaseBoardFilterSettings): unknown {
  const { conditions, logic } = settings;

  const notionConditions = conditions
    .filter(c => c.property && c.operator)
    .map(buildSingleCondition)
    .filter(Boolean);

  if (notionConditions.length === 0) return {};
  if (notionConditions.length === 1) return notionConditions[0];
  return { [logic]: notionConditions };
}

function buildSingleCondition(c: FilterCondition): unknown {
  const notionProp = DEFAULT_FIELD_MAP[c.property as FieldMappingKey] ?? c.property;
  const type = FIELD_TYPE_MAP[c.property as FieldMappingKey];

  if (!type) return null;

  if (NO_VALUE_OPERATORS.includes(c.operator)) {
    return { property: notionProp, [type]: { [c.operator]: true } };
  }

  return { property: notionProp, [type]: { [c.operator]: c.value } };
}
