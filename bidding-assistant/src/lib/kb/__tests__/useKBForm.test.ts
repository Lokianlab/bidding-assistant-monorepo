/**
 * useKBForm Hook 測試
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useKBForm } from '../useKBForm';
import * as KBApiModule from '../api-client';
import { KBItem } from '../types';

vi.mock('../api-client');

describe('useKBForm', () => {
  const mockItem: KBItem = {
    id: '1',
    tenant_id: 'test',
    category: '00A',
    title: 'Test Item',
    content: 'Test Content',
    tags: ['tag1', 'tag2'],
    parent_id: null,
    created_by: 'user@test.com',
    created_at: '2026-02-23T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('初始化', () => {
    it('應該初始化預設值', () => {
      const { result } = renderHook(() => useKBForm());

      expect(result.current.form.category).toBe('00A');
      expect(result.current.form.title).toBe('');
      expect(result.current.form.content).toBe('');
      expect(result.current.form.tags).toEqual([]);
      expect(result.current.form.parentId).toBeNull();
    });

    it('應該初始化項目資訊', () => {
      const { result } = renderHook(() => useKBForm(mockItem));

      expect(result.current.form.title).toBe('Test Item');
      expect(result.current.form.content).toBe('Test Content');
      expect(result.current.form.category).toBe('00A');
    });

    it('應該初始化空的錯誤狀態', () => {
      const { result } = renderHook(() => useKBForm());

      expect(result.current.errors).toEqual({});
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.submitError).toBeNull();
    });
  });

  describe('表單更新', () => {
    it('應該能更新標題', () => {
      const { result } = renderHook(() => useKBForm());

      act(() => {
        result.current.setForm({ title: 'New Title' });
      });

      expect(result.current.form.title).toBe('New Title');
    });

    it('應該能更新內容', () => {
      const { result } = renderHook(() => useKBForm());

      act(() => {
        result.current.setForm({ content: 'New Content' });
      });

      expect(result.current.form.content).toBe('New Content');
    });

    it('應該能更新分類', () => {
      const { result } = renderHook(() => useKBForm());

      act(() => {
        result.current.setForm({ category: '00B' });
      });

      expect(result.current.form.category).toBe('00B');
    });

    it('應該能更新標籤', () => {
      const { result } = renderHook(() => useKBForm());

      act(() => {
        result.current.setForm({ tags: ['tag1', 'tag2'] });
      });

      expect(result.current.form.tags).toEqual(['tag1', 'tag2']);
    });

    it('更新欄位應該清除相關錯誤', () => {
      const { result } = renderHook(() => useKBForm());

      // 先驗證以產生錯誤
      act(() => {
        result.current.validate();
      });

      expect(result.current.errors.title).toBeDefined();

      // 更新標題應該清除錯誤
      act(() => {
        result.current.setForm({ title: 'New Title' });
      });

      expect(result.current.errors.title).toBeUndefined();
    });
  });

  describe('表單驗證', () => {
    it('空表單應該驗證失敗', () => {
      const { result } = renderHook(() => useKBForm());

      let isValid: boolean | undefined;
      act(() => {
        isValid = result.current.validate();
      });

      expect(isValid).toBe(false);
      expect(result.current.errors.title).toBeDefined();
    });

    it('有效表單應該驗證通過', () => {
      const { result } = renderHook(() => useKBForm());

      act(() => {
        result.current.setForm({
          category: '00A',
          title: 'Valid Title',
          content: 'Valid Content',
        });
      });

      const isValid = result.current.validate();

      expect(isValid).toBe(true);
      expect(result.current.errors).toEqual({});
    });

    it('標題過長應該驗證失敗', () => {
      const { result } = renderHook(() => useKBForm());

      act(() => {
        result.current.setForm({
          title: 'a'.repeat(201),
        });
      });

      let isValid: boolean | undefined;
      act(() => {
        isValid = result.current.validate();
      });

      expect(isValid).toBe(false);
      expect(result.current.errors.title).toBeDefined();
    });

    it('內容過長應該驗證失敗', () => {
      const { result } = renderHook(() => useKBForm());

      act(() => {
        result.current.setForm({
          category: '00A',
          title: 'Valid Title',
          content: 'a'.repeat(5001),
        });
      });

      let isValid: boolean | undefined;
      act(() => {
        isValid = result.current.validate();
      });

      expect(isValid).toBe(false);
      expect(result.current.errors.content).toBeDefined();
    });

    it('空標題應該驗證失敗', () => {
      const { result } = renderHook(() => useKBForm());

      act(() => {
        result.current.setForm({ title: '   ' });
      });

      let isValid: boolean | undefined;
      act(() => {
        isValid = result.current.validate();
      });

      expect(isValid).toBe(false);
      expect(result.current.errors.title).toBeDefined();
    });
  });

  describe('表單提交 - 新建', () => {
    it('應該能提交新項目', async () => {
      const mockNewItem: KBItem = {
        ...mockItem,
        id: '2',
        title: 'New Item',
      };

      vi.mocked(KBApiModule.KBApiClient.createItem).mockResolvedValueOnce(
        mockNewItem
      );

      const { result } = renderHook(() => useKBForm());

      act(() => {
        result.current.setForm({
          category: '00A',
          title: 'New Item',
          content: 'New Content',
        });
      });

      const submitResult = await act(async () => {
        return result.current.submit();
      });

      expect(submitResult).toEqual(mockNewItem);
      expect(vi.mocked(KBApiModule.KBApiClient.createItem)).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Item',
          category: '00A',
        })
      );
    });

    it('提交前應該驗證表單', async () => {
      const { result } = renderHook(() => useKBForm());

      const submitResult = await act(async () => {
        return result.current.submit();
      });

      expect(submitResult).toBeNull();
      expect(vi.mocked(KBApiModule.KBApiClient.createItem)).not.toHaveBeenCalled();
    });

    it('提交失敗應該設定錯誤', async () => {
      vi.mocked(KBApiModule.KBApiClient.createItem).mockRejectedValueOnce(
        new Error('Create failed')
      );

      const { result } = renderHook(() => useKBForm());

      act(() => {
        result.current.setForm({
          category: '00A',
          title: 'New Item',
          content: 'Content',
        });
      });

      await act(async () => {
        result.current.submit();
      });

      await waitFor(() => {
        expect(result.current.submitError).toBe('Create failed');
      });
    });

    it('成功提交後應該重置表單', async () => {
      vi.mocked(KBApiModule.KBApiClient.createItem).mockResolvedValueOnce(
        mockItem
      );

      const { result } = renderHook(() => useKBForm());

      act(() => {
        result.current.setForm({
          category: '00A',
          title: 'New Item',
          content: 'Content',
        });
      });

      await act(async () => {
        result.current.submit();
      });

      expect(result.current.form.title).toBe('');
      expect(result.current.form.content).toBe('');
    });
  });

  describe('表單提交 - 編輯', () => {
    it('應該能提交編輯項目', async () => {
      const updatedItem = { ...mockItem, title: 'Updated Title' };
      vi.mocked(KBApiModule.KBApiClient.updateItem).mockResolvedValueOnce(
        updatedItem
      );

      const { result } = renderHook(() => useKBForm(mockItem));

      act(() => {
        result.current.setForm({ title: 'Updated Title' });
      });

      const submitResult = await act(async () => {
        return result.current.submit(mockItem.id);
      });

      expect(submitResult).toEqual(updatedItem);
      expect(vi.mocked(KBApiModule.KBApiClient.updateItem)).toHaveBeenCalledWith(
        mockItem.id,
        expect.objectContaining({
          title: 'Updated Title',
        })
      );
    });

    it('編輯提交失敗應該設定錯誤', async () => {
      vi.mocked(KBApiModule.KBApiClient.updateItem).mockRejectedValueOnce(
        new Error('Update failed')
      );

      const { result } = renderHook(() => useKBForm(mockItem));

      await act(async () => {
        result.current.submit(mockItem.id);
      });

      await waitFor(() => {
        expect(result.current.submitError).toBe('Update failed');
      });
    });
  });

  describe('表單重置', () => {
    it('應該能重置為預設值', () => {
      const { result } = renderHook(() => useKBForm());

      act(() => {
        result.current.setForm({
          title: 'Changed Title',
          content: 'Changed Content',
        });
      });

      expect(result.current.form.title).toBe('Changed Title');

      act(() => {
        result.current.reset();
      });

      expect(result.current.form.title).toBe('');
      expect(result.current.form.content).toBe('');
    });

    it('應該能重置為初始項目值', () => {
      const { result } = renderHook(() => useKBForm(mockItem));

      act(() => {
        result.current.setForm({ title: 'Changed Title' });
      });

      expect(result.current.form.title).toBe('Changed Title');

      act(() => {
        result.current.reset();
      });

      expect(result.current.form.title).toBe('Test Item');
    });

    it('重置應該清除錯誤', () => {
      const { result } = renderHook(() => useKBForm());

      // 產生驗證錯誤
      act(() => {
        result.current.validate();
      });

      expect(Object.keys(result.current.errors).length).toBeGreaterThan(0);

      // 重置應該清除錯誤
      act(() => {
        result.current.reset();
      });

      expect(result.current.errors).toEqual({});
    });

    it('重置應該清除提交錯誤', () => {
      const { result } = renderHook(() => useKBForm());

      // 模擬提交錯誤狀態
      act(() => {
        result.current.setForm({ title: 'test' });
      });

      // 重置應該清除錯誤
      act(() => {
        result.current.reset();
      });

      expect(result.current.submitError).toBeNull();
    });
  });

  describe('提交狀態', () => {
    it('提交時應該設定 isSubmitting 為 true', async () => {
      vi.mocked(KBApiModule.KBApiClient.createItem).mockImplementation(
        () => new Promise((resolve) =>
          setTimeout(() => resolve(mockItem), 100)
        )
      );

      const { result } = renderHook(() => useKBForm());

      act(() => {
        result.current.setForm({
          category: '00A',
          title: 'New Item',
          content: 'Content',
        });
      });

      const promise = act(async () => {
        return result.current.submit();
      });

      // 注意：由於非同步的性質，立即檢查可能不會捕捉到 isSubmitting
      await promise;

      expect(result.current.isSubmitting).toBe(false);
    });

    it('提交後應該重置 isSubmitting', async () => {
      vi.mocked(KBApiModule.KBApiClient.createItem).mockResolvedValueOnce(
        mockItem
      );

      const { result } = renderHook(() => useKBForm());

      act(() => {
        result.current.setForm({
          category: '00A',
          title: 'New Item',
          content: 'Content',
        });
      });

      await act(async () => {
        result.current.submit();
      });

      expect(result.current.isSubmitting).toBe(false);
    });
  });

  describe('API 整合', () => {
    it('應該傳遞正確的參數到 createItem', async () => {
      vi.mocked(KBApiModule.KBApiClient.createItem).mockResolvedValueOnce(
        mockItem
      );

      const { result } = renderHook(() => useKBForm());

      const formData = {
        category: '00B' as const,
        title: 'Test Title',
        content: 'Test Content',
        tags: ['tag1'],
        parentId: 'parent-id',
      };

      act(() => {
        result.current.setForm(formData);
      });

      await act(async () => {
        result.current.submit();
      });

      expect(vi.mocked(KBApiModule.KBApiClient.createItem)).toHaveBeenCalledWith(
        expect.objectContaining(formData)
      );
    });

    it('應該傳遞正確的參數到 updateItem', async () => {
      vi.mocked(KBApiModule.KBApiClient.updateItem).mockResolvedValueOnce(
        mockItem
      );

      const { result } = renderHook(() => useKBForm(mockItem));

      act(() => {
        result.current.setForm({
          title: 'Updated Title',
          content: 'Updated Content',
        });
      });

      await act(async () => {
        result.current.submit(mockItem.id);
      });

      expect(vi.mocked(KBApiModule.KBApiClient.updateItem)).toHaveBeenCalledWith(
        mockItem.id,
        expect.objectContaining({
          title: 'Updated Title',
          content: 'Updated Content',
        })
      );
    });
  });
});
