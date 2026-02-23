// GET /api/cases/[id]/presentation/export
// M08 評選簡報匯出 PPTX

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: caseId } = await context.params;
    const format = request.nextUrl.searchParams.get('format') || 'pptx';

    // Mock PPTX 生成（實際應使用 pptxgen 庫）
    // 簡單的 PPTX 文件簽名 + 內容
    const mockPptxContent = Buffer.from([
      0x50, 0x4b, 0x03, 0x04, // PK signature
      0x14, 0x00, 0x00, 0x00, 0x08, 0x00,
      // ... 更多 ZIP 簽名字節
      0x2d, 0x01, 0x02, 0x14, 0x03, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00,
    ]);

    // 回傳 PPTX 檔案
    const response = new NextResponse(mockPptxContent);
    response.headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    response.headers.set('Content-Disposition', `attachment; filename="presentation-${caseId}-${Date.now()}.${format}"`);
    response.headers.set('Content-Length', mockPptxContent.length.toString());

    return response;
  } catch (error) {
    console.error('Error exporting presentation:', error);
    return NextResponse.json(
      { error: '簡報匯出失敗' },
      { status: 500 }
    );
  }
}
