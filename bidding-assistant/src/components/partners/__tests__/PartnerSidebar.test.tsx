import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PartnerSidebar } from "../PartnerSidebar";
import type { Partner } from "@/lib/partners/types";

const mockPartners: Partner[] = [
  {
    id: "1",
    tenant_id: "tenant-1",
    name: "技術顧問公司",
    category: ["技術顧問", "系統整合"],
    contact_name: "王經理",
    phone: "02-12345678",
    email: "contact@tech.com",
    rating: 5,
    cooperation_count: 15,
    tags: ["推薦", "定期合作"],
    status: "active",
    created_at: "2025-01-01",
    updated_at: "2025-02-01",
  },
  {
    id: "2",
    tenant_id: "tenant-1",
    name: "建築設計事務所",
    category: ["建築設計"],
    contact_name: "李設計師",
    phone: "03-87654321",
    email: "design@arch.com",
    rating: 3,
    cooperation_count: 5,
    tags: ["新合作"],
    status: "active",
    created_at: "2025-01-15",
    updated_at: "2025-02-15",
  },
  {
    id: "3",
    tenant_id: "tenant-1",
    name: "法律顧問事務所",
    category: ["法律顧問"],
    rating: 4,
    cooperation_count: 10,
    tags: ["推薦"],
    status: "active",
    created_at: "2025-01-20",
    updated_at: "2025-02-20",
  },
];

describe("PartnerSidebar", () => {
  it("應該顯示合作夥伴列表", () => {
    render(
      <PartnerSidebar
        partners={mockPartners}
        onSelectPartner={vi.fn()}
      />
    );

    expect(screen.getByText("技術顧問公司")).toBeTruthy();
    expect(screen.getByText("建築設計事務所")).toBeTruthy();
    expect(screen.getByText("法律顧問事務所")).toBeTruthy();
  });

  it("應該搜尋合作夥伴名稱", async () => {
    const user = userEvent.setup();
    render(
      <PartnerSidebar
        partners={mockPartners}
        onSelectPartner={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText("搜尋合作夥伴...");
    await user.type(searchInput, "技術");

    expect(screen.getByText("技術顧問公司")).toBeTruthy();
    expect(screen.queryByText("建築設計事務所")).toBeNull();
  });

  it("應該支持選擇合作夥伴", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(
      <PartnerSidebar
        partners={mockPartners}
        onSelectPartner={onSelect}
      />
    );

    const partnerButton = screen.getByText("技術顧問公司").closest("button");
    if (partnerButton) {
      await user.click(partnerButton);
    }

    expect(onSelect).toHaveBeenCalledWith(mockPartners[0]);
  });

  it("應該顯示新增按鈕當提供 onAddPartner", () => {
    const onAdd = vi.fn();
    render(
      <PartnerSidebar
        partners={mockPartners}
        onAddPartner={onAdd}
      />
    );

    expect(screen.getByText("+")).toBeTruthy();
  });

  it("應該顯示空狀態當沒有合作夥伴", () => {
    render(
      <PartnerSidebar
        partners={[]}
        onSelectPartner={vi.fn()}
      />
    );

    expect(screen.getByText("暫無合作夥伴")).toBeTruthy();
  });

  it("應該顯示信任度分數", () => {
    render(
      <PartnerSidebar
        partners={mockPartners}
        onSelectPartner={vi.fn()}
      />
    );

    // 信任度計算: (rating/5 * 60) + (cooperation_count/100 * 40)
    // 對於第一個夥伴: (5/5 * 60) + (15/100 * 40) = 60 + 6 = 66
    const firstPartner = screen.getByText("技術顧問公司").closest("button");
    expect(firstPartner?.textContent).toContain("66");
  });

  it("應該支持過濾最低評分", async () => {
    const user = userEvent.setup();
    render(
      <PartnerSidebar
        partners={mockPartners}
        onSelectPartner={vi.fn()}
      />
    );

    // 打開篩選面板
    await user.click(screen.getByText("顯示篩選"));

    // 選擇評分 4
    const ratingButton = screen.getByRole("button", { name: /^4$/ });
    await user.click(ratingButton);

    // 應該只顯示評分 >= 4 的夥伴
    expect(screen.getByText("技術顧問公司")).toBeTruthy();
    expect(screen.getByText("法律顧問事務所")).toBeTruthy();
    expect(screen.queryByText("建築設計事務所")).toBeNull();
  });
});
