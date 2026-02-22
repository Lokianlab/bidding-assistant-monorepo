import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CompanyPage from "../page";
import { DEFAULT_SETTINGS } from "@/lib/settings/defaults";
import { useSettings } from "@/lib/context/settings-context";

// ── Hoisted mocks（在 vi.mock 工廠提升前初始化）─────────────
const { mockUpdateSection, mockToastSuccess } = vi.hoisted(() => ({
  mockUpdateSection: vi.fn(),
  mockToastSuccess: vi.fn(),
}));

// ── Mock useSettings ──────────────────────────────────────
vi.mock("@/lib/context/settings-context", () => ({
  useSettings: vi.fn(() => ({
    settings: DEFAULT_SETTINGS,
    hydrated: true,
    updateSection: mockUpdateSection,
  })),
}));

// ── Mock sonner ───────────────────────────────────────────
vi.mock("sonner", () => ({ toast: { success: mockToastSuccess, error: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useSettings).mockReturnValue({
    settings: DEFAULT_SETTINGS,
    hydrated: true,
    updateSection: mockUpdateSection,
  } as unknown as ReturnType<typeof useSettings>);
});

// ── Tests ─────────────────────────────────────────────────

describe("CompanyPage — 渲染", () => {
  it("顯示頁面標題", () => {
    render(<CompanyPage />);
    expect(screen.getByText("公司資訊")).toBeTruthy();
  });

  it("顯示初始公司名稱", () => {
    render(<CompanyPage />);
    const input = screen.getByLabelText("公司名稱") as HTMLInputElement;
    expect(input.value).toBe(DEFAULT_SETTINGS.company.name);
  });

  it("顯示初始品牌名稱", () => {
    render(<CompanyPage />);
    const input = screen.getByLabelText("品牌（用於情報搜尋）") as HTMLInputElement;
    expect(input.value).toBe(DEFAULT_SETTINGS.company.brand);
  });
});

describe("CompanyPage — 輸入互動", () => {
  it("可修改公司名稱", () => {
    render(<CompanyPage />);
    const input = screen.getByLabelText("公司名稱") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "測試公司名稱" } });
    expect(input.value).toBe("測試公司名稱");
  });

  it("可修改統一編號", () => {
    render(<CompanyPage />);
    const input = screen.getByLabelText("統一編號") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "12345678" } });
    expect(input.value).toBe("12345678");
  });

  it("可修改品牌名稱", () => {
    render(<CompanyPage />);
    const input = screen.getByLabelText("品牌（用於情報搜尋）") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "測試品牌" } });
    expect(input.value).toBe("測試品牌");
  });
});

describe("CompanyPage — 儲存", () => {
  it("點儲存呼叫 updateSection('company', ...)", () => {
    render(<CompanyPage />);
    fireEvent.click(screen.getByText("儲存"));
    expect(mockUpdateSection).toHaveBeenCalledTimes(1);
    expect(mockUpdateSection).toHaveBeenCalledWith("company", DEFAULT_SETTINGS.company);
  });

  it("點儲存顯示成功 toast", () => {
    render(<CompanyPage />);
    fireEvent.click(screen.getByText("儲存"));
    expect(mockToastSuccess).toHaveBeenCalledWith("公司資訊已儲存");
  });

  it("修改欄位後點儲存傳送更新後的值", () => {
    render(<CompanyPage />);
    const input = screen.getByLabelText("公司名稱") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "新公司名稱" } });
    fireEvent.click(screen.getByText("儲存"));
    expect(mockUpdateSection).toHaveBeenCalledWith(
      "company",
      expect.objectContaining({ name: "新公司名稱" })
    );
  });
});

describe("CompanyPage — 取消", () => {
  it("點取消還原欄位到設定值", () => {
    render(<CompanyPage />);
    const input = screen.getByLabelText("公司名稱") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "臨時修改" } });
    expect(input.value).toBe("臨時修改");

    fireEvent.click(screen.getByText("取消"));
    expect(input.value).toBe(DEFAULT_SETTINGS.company.name);
  });

  it("點取消不呼叫 updateSection", () => {
    render(<CompanyPage />);
    fireEvent.click(screen.getByText("取消"));
    expect(mockUpdateSection).not.toHaveBeenCalled();
  });
});

describe("CompanyPage — hydration 同步", () => {
  it("hydrated 時 local state 與 settings 一致", () => {
    const customSettings = {
      ...DEFAULT_SETTINGS,
      company: { name: "localStorage 公司", taxId: "87654321", brand: "自訂品牌" },
    };
    vi.mocked(useSettings).mockReturnValue({
      settings: customSettings,
      hydrated: true,
      updateSection: mockUpdateSection,
    } as unknown as ReturnType<typeof useSettings>);

    render(<CompanyPage />);
    const input = screen.getByLabelText("公司名稱") as HTMLInputElement;
    expect(input.value).toBe("localStorage 公司");
  });
});
