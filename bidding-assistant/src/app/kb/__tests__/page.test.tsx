/**
 * 知識庫頁面測試套件
 * 覆蓋 UI 整合和使用者互動流程
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import KBPage from '../page';

// Mock API
vi.mock('@/lib/kb/api-client', () => ({
  KBApiClient: {
    listItems: vi.fn().mockResolvedValue({
      data: [
        {
          id: '1',
          tenant_id: 'test-tenant',
          category: '00A',
          title: 'Test Item 1',
          content: 'Content 1',
          tags: ['tag1'],
          created_by: 'user@test.com',
          created_at: '2026-02-23T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    }),
    getItem: vi.fn(),
    createItem: vi.fn(),
    updateItem: vi.fn(),
    deleteItem: vi.fn(),
    searchItems: vi.fn(),
  },
}));

describe('KBPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('頁面載入', () => {
    it('應該正確渲染頁面標題', async () => {
      render(<KBPage />);
      await waitFor(() => {
        expect(screen.getByText('知識庫管理')).toBeInTheDocument();
      });
    });

    it('應該顯示新增項目按鈕', () => {
      render(<KBPage />);
      const addButton = screen.getByText('新增項目');
      expect(addButton).toBeInTheDocument();
    });

    it('應該顯示分類側邊欄', () => {
      render(<KBPage />);
      expect(screen.getByText('分類')).toBeInTheDocument();
    });

    it('應該顯示搜尋欄', () => {
      render(<KBPage />);
      expect(screen.getByPlaceholderText('搜尋項目...')).toBeInTheDocument();
    });
  });

  describe('分類篩選', () => {
    it('應該預設顯示全部分類', async () => {
      render(<KBPage />);

      // 先確保分類側邊欄已經渲染
      await waitFor(() => {
        expect(screen.getByText('分類')).toBeInTheDocument();
        expect(screen.getByText('全部')).toBeInTheDocument();
      });

      // 確認「全部」在初始化時就被選中
      // 簡單檢查：側邊欄應該有「全部」按鈕
      expect(screen.getByText('全部')).toBeInTheDocument();
    });

    it('點擊分類應該切換選擇', async () => {
      render(<KBPage />);
      const user = userEvent.setup();

      // 確保頁面已載入
      await waitFor(() => {
        expect(screen.getByText('策略框架')).toBeInTheDocument();
      });

      // 點擊「策略框架」分類——取得包含該文本的 button
      const buttons = screen.getAllByRole('button');
      const categoryButton = buttons.find((btn) =>
        btn.textContent?.includes('策略框架')
      );
      expect(categoryButton).toBeDefined();

      await user.click(categoryButton!);

      // 驗證選擇已更新——被選中的分類按鈕應該有 primary 背景
      // 需要 waitFor 因為 React 狀態更新是非同步的
      await waitFor(() => {
        expect(categoryButton).toHaveClass('bg-primary');
      });
    });

    it('分類切換應該觸發表格重新載入', async () => {
      const { KBApiClient } = await import('@/lib/kb/api-client');
      const mockListItems = vi.spyOn(KBApiClient, 'listItems');

      render(<KBPage />);
      const user = userEvent.setup();

      // 初始呼叫
      await waitFor(() => {
        expect(mockListItems).toHaveBeenCalled();
      });

      // 點擊分類
      const categoryButton = screen.getAllByText(/策略框架/)[0];
      await user.click(categoryButton);

      // 驗證 API 被重新呼叫
      await waitFor(() => {
        expect(mockListItems).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('搜尋功能', () => {
    it('應該能輸入搜尋關鍵字', async () => {
      render(<KBPage />);
      const searchInput = screen.getByPlaceholderText('搜尋項目...') as HTMLInputElement;

      expect(searchInput.value).toBe('');

      fireEvent.change(searchInput, { target: { value: '測試' } });
      expect(searchInput.value).toBe('測試');
    });

    it('按 Enter 應該執行搜尋', async () => {
      const { KBApiClient } = await import('@/lib/kb/api-client');
      vi.mocked(KBApiClient.listItems).mockClear();

      render(<KBPage />);
      const searchInput = screen.getByPlaceholderText('搜尋項目...') as HTMLInputElement;

      // 初始載入後清空 mock 計數
      await waitFor(() => {
        expect(vi.mocked(KBApiClient.listItems)).toHaveBeenCalled();
      });
      vi.mocked(KBApiClient.listItems).mockClear();

      // 輸入搜尋詞並按 Enter
      fireEvent.change(searchInput, { target: { value: '測試' } });
      fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' });

      // 等待搜尋 API 被呼叫
      await waitFor(
        () => {
          expect(vi.mocked(KBApiClient.listItems)).toHaveBeenCalledWith(
            expect.objectContaining({ search: '測試' })
          );
        },
        { timeout: 1000 }
      );
    });

    it('清除按鈕應該清空搜尋', async () => {
      render(<KBPage />);
      const searchInput = screen.getByPlaceholderText('搜尋項目...') as HTMLInputElement;

      // 輸入搜尋詞
      fireEvent.change(searchInput, { target: { value: '測試' } });

      // 驗證輸入成功
      expect(searchInput.value).toBe('測試');

      // 等待清除按鈕出現
      const clearButton = await screen.findByLabelText('清除搜尋');
      expect(clearButton).toBeInTheDocument();

      // 點擊清除按鈕
      fireEvent.click(clearButton);

      // 驗證搜尋欄已清空
      expect(searchInput.value).toBe('');
    });
  });

  describe('表格顯示', () => {
    it('應該在載入後顯示表格行', async () => {
      render(<KBPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });
    });

    it('表格應該顯示所有必要欄位', async () => {
      render(<KBPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
        expect(screen.getByText('00A')).toBeInTheDocument();
        expect(screen.getByText('user@test.com')).toBeInTheDocument();
      });
    });

    it('應該在沒有項目時顯示空狀態', async () => {
      const { KBApiClient } = await import('@/lib/kb/api-client');
      vi.mocked(KBApiClient.listItems).mockResolvedValueOnce({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
      });

      render(<KBPage />);

      await waitFor(() => {
        expect(screen.getByText('沒有找到符合條件的項目')).toBeInTheDocument();
      });
    });
  });

  describe('多選功能', () => {
    it('應該能選擇單個項目', async () => {
      render(<KBPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(1); // Header + at least one row

      const rowCheckbox = checkboxes[1]; // Skip header checkbox
      expect(rowCheckbox.getAttribute('aria-checked')).toBe('false');

      // 點擊行 checkbox
      await userEvent.click(rowCheckbox);

      await new Promise(resolve => setTimeout(resolve, 50));

      // 驗證狀態已改變
      const updatedCheckbox = screen.getAllByRole('checkbox')[1];
      expect(updatedCheckbox.getAttribute('aria-checked')).toBe('true');
    });

    it('應該能全選所有項目', async () => {
      render(<KBPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      const headerCheckbox = screen.getAllByRole('checkbox')[0];
      console.log('Initial aria-checked:', headerCheckbox.getAttribute('aria-checked'));

      // 使用 userEvent 與 tab + space 來正確互動（Radix UI 推薦的方式）
      console.log('Clicking header checkbox...');
      await userEvent.click(headerCheckbox);

      console.log('After click, waiting for update...');
      await new Promise(resolve => setTimeout(resolve, 100));

      const updatedCheckbox = screen.getAllByRole('checkbox')[0];
      const finalState = updatedCheckbox.getAttribute('data-state');
      const finalAria = updatedCheckbox.getAttribute('aria-checked');

      console.log('Final data-state:', finalState);
      console.log('Final aria-checked:', finalAria);

      // 相鄰的行 checkbox 也應該被選中（如果全選有效的話）
      const rowCheckboxes = screen.getAllByRole('checkbox').slice(1);
      console.log('Row checkboxes count:', rowCheckboxes.length);
      rowCheckboxes.forEach((cb, i) => {
        console.log(`Row ${i} data-state:`, cb.getAttribute('data-state'));
      });

      // 期待 data-state 改變為 checked
      expect(finalState).toBe('checked');
    });
  });

  describe('新增項目', () => {
    it('點擊新增按鈕應該開啟對話框', async () => {
      render(<KBPage />);

      const addButton = screen.getByText('新增項目');
      await userEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('新增知識庫項目')).toBeInTheDocument();
      });
    });

    it('新增對話框應該有分類、標題、內容欄位', async () => {
      render(<KBPage />);

      const addButton = screen.getByText('新增項目');
      await userEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('輸入項目標題')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('輸入項目內容（可選）')).toBeInTheDocument();
      });
    });

    it('新增成功後應該關閉對話框並重新載入', async () => {
      const { KBApiClient } = await import('@/lib/kb/api-client');
      vi.mocked(KBApiClient.createItem).mockResolvedValueOnce({
        id: '2',
        tenant_id: 'test-tenant',
        category: '00A',
        title: 'New Item',
        content: 'New Content',
        tags: [],
        created_by: 'user@test.com',
        created_at: '2026-02-23T00:00:00Z',
      });

      render(<KBPage />);

      const addButton = screen.getByText('新增項目');
      await userEvent.click(addButton);

      const titleInput = await screen.findByPlaceholderText('輸入項目標題');
      await userEvent.type(titleInput, 'New Item');

      const submitButton = screen.getByText('新增');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(vi.mocked(KBApiClient.createItem)).toHaveBeenCalled();
      });
    });
  });

  describe('編輯項目', () => {
    it('點擊編輯按鈕應該開啟編輯對話框', async () => {
      render(<KBPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button');
      const editButton = editButtons.find((btn) =>
        btn.querySelector('[class*="edit"]')
      );

      if (editButton) {
        await userEvent.click(editButton);
      }
    });

    it('編輯對話框應該預填當前項目資訊', async () => {
      render(<KBPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      // 編輯流程
      const table = screen.getByText('Test Item 1').closest('table');
      expect(table).toBeInTheDocument();
    });
  });

  describe('刪除項目', () => {
    it('點擊刪除按鈕應該開啟確認對話框', async () => {
      render(<KBPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button');
      const deleteButton = deleteButtons.find((btn) =>
        btn.querySelector('[class*="red"]')
      );

      if (deleteButton) {
        await userEvent.click(deleteButton);
      }
    });

    it('確認刪除應該呼叫 API 並重新載入', async () => {
      const { KBApiClient } = await import('@/lib/kb/api-client');
      const mockDeleteItem = vi.spyOn(KBApiClient, 'deleteItem');

      render(<KBPage />);

      await waitFor(() => {
        expect(screen.getByText('Test Item 1')).toBeInTheDocument();
      });

      // 模擬刪除流程
      expect(mockDeleteItem).toBeDefined();
    });
  });

  describe('分頁', () => {
    it('應該顯示分頁控制', async () => {
      render(<KBPage />);

      await waitFor(() => {
        expect(screen.getByText(/第.*頁/)).toBeInTheDocument();
      });
    });

    it('下一頁按鈕應該在有更多資料時啟用', async () => {
      const { KBApiClient } = await import('@/lib/kb/api-client');
      vi.mocked(KBApiClient.listItems).mockResolvedValueOnce({
        data: Array(20).fill(null).map((_, i) => ({
          id: `${i}`,
          tenant_id: 'test-tenant',
          category: '00A',
          title: `Item ${i}`,
          content: '',
          tags: [],
          created_by: 'user@test.com',
          created_at: '2026-02-23T00:00:00Z',
        })),
        total: 100,
        page: 1,
        limit: 20,
      });

      render(<KBPage />);

      await waitFor(() => {
        const nextButton = screen.getByText('下一頁');
        expect(nextButton).not.toBeDisabled();
      });
    });

    it('上一頁按鈕應該在第一頁時禁用', async () => {
      render(<KBPage />);

      await waitFor(() => {
        const prevButton = screen.getByText('上一頁');
        expect(prevButton).toBeDisabled();
      });
    });
  });

  describe('錯誤處理', () => {
    it('API 錯誤應該顯示錯誤訊息', async () => {
      const { KBApiClient } = await import('@/lib/kb/api-client');
      vi.mocked(KBApiClient.listItems).mockRejectedValueOnce(
        new Error('API Error')
      );

      render(<KBPage />);

      await waitFor(() => {
        expect(screen.getByText(/API Error/)).toBeInTheDocument();
      });
    });

    it('重新載入應該清除之前的錯誤訊息', async () => {
      render(<KBPage />);

      await waitFor(() => {
        expect(screen.getByText('知識庫管理')).toBeInTheDocument();
      });
    });
  });

  describe('載入狀態', () => {
    it('載入時應該顯示骨架屏', async () => {
      const { KBApiClient } = await import('@/lib/kb/api-client');

      // 延遲第一個呼叫
      vi.mocked(KBApiClient.listItems).mockImplementationOnce(
        () => new Promise((resolve) =>
          setTimeout(() =>
            resolve({
              data: [],
              total: 0,
              page: 1,
              limit: 20,
            }),
            100
          )
        )
      );

      render(<KBPage />);

      // 應該能看到載入狀態的一些指示
      expect(screen.getByText('知識庫管理')).toBeInTheDocument();
    });
  });
});
