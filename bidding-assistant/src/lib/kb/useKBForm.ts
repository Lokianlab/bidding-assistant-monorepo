/**
 * 知識庫表單管理 Hook
 */

import { useState, useCallback } from 'react';
import { KBFormData, KBFormErrors, KBItem, KBCategory } from './types';
import { KBApiClient } from './api-client';

export interface UseKBFormReturn {
  form: KBFormData;
  setForm: (form: Partial<KBFormData>) => void;
  reset: () => void;
  errors: KBFormErrors;
  validate: () => boolean;
  isSubmitting: boolean;
  submitError: string | null;
  submit: (itemId?: string) => Promise<KBItem | null>;
}

const DEFAULT_FORM: KBFormData = {
  category: '00A',
  title: '',
  content: '',
  tags: [],
  parentId: null,
};

export function useKBForm(initialData?: KBItem): UseKBFormReturn {
  const [form, setFormState] = useState<KBFormData>(
    initialData
      ? {
          category: initialData.category,
          title: initialData.title,
          content: initialData.content,
          tags: initialData.tags || [],
          parentId: initialData.parent_id || null,
        }
      : DEFAULT_FORM,
  );

  const [errors, setErrors] = useState<KBFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const setForm = useCallback((updates: Partial<KBFormData>) => {
    setFormState((prev) => ({ ...prev, ...updates }));
    // 清除相關欄位的錯誤訊息
    const errorKeys = Object.keys(updates) as Array<keyof KBFormData>;
    setErrors((prev) => {
      const newErrors = { ...prev };
      errorKeys.forEach((key) => {
        delete newErrors[key as keyof KBFormErrors];
      });
      return newErrors;
    });
  }, []);

  const reset = useCallback(() => {
    setFormState(initialData ? {
      category: initialData.category,
      title: initialData.title,
      content: initialData.content,
      tags: initialData.tags || [],
      parentId: initialData.parent_id || null,
    } : DEFAULT_FORM);
    setErrors({});
    setSubmitError(null);
  }, [initialData]);

  const validate = useCallback((): boolean => {
    const newErrors: KBFormErrors = {};

    if (!form.category) {
      newErrors.category = '請選擇分類';
    }

    if (!form.title || form.title.trim().length === 0) {
      newErrors.title = '標題不能為空';
    }

    if (form.title && form.title.length > 200) {
      newErrors.title = '標題不能超過 200 字';
    }

    if (form.content && form.content.length > 5000) {
      newErrors.content = '內容不能超過 5000 字';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  const submit = useCallback(
    async (itemId?: string): Promise<KBItem | null> => {
      setSubmitError(null);

      if (!validate()) {
        return null;
      }

      setIsSubmitting(true);

      try {
        let result: KBItem;

        if (itemId) {
          // 編輯
          result = await KBApiClient.updateItem(itemId, {
            title: form.title,
            content: form.content,
            tags: form.tags,
          });
        } else {
          // 新建
          result = await KBApiClient.createItem(form);
        }

        reset();
        return result;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to submit form';
        setSubmitError(message);
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    [form, validate, reset],
  );

  return {
    form,
    setForm,
    reset,
    errors,
    validate,
    isSubmitting,
    submitError,
    submit,
  };
}
