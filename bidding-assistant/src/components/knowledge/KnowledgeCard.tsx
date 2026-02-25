'use client';

interface KnowledgeCardProps {
  title: string | null;
  summary: string;
  category: string | null;
  subcategory: string | null;
  tags: string[];
  sourceFileName: string;
  driveUrl: string | null;
  fileType: string | null;
}

const FILE_TYPE_ICONS: Record<string, string> = {
  pptx: '📊',
  pdf: '📄',
  docx: '📝',
  xlsx: '📈',
  gdoc: '📃',
  gslides: '🖼️',
};

export function KnowledgeCard({
  title,
  summary,
  category,
  subcategory,
  tags,
  sourceFileName,
  driveUrl,
  fileType,
}: KnowledgeCardProps) {
  return (
    <div className="border rounded-lg p-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">
            {FILE_TYPE_ICONS[fileType ?? ''] ?? '📄'} {title ?? sourceFileName}
          </h4>
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">{summary}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {category && (
          <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
            {category}
          </span>
        )}
        {subcategory && (
          <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
            {subcategory}
          </span>
        )}
        {tags.slice(0, 3).map((tag) => (
          <span key={tag} className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
        <span className="truncate">{sourceFileName}</span>
        {driveUrl && (
          <a
            href={driveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline whitespace-nowrap ml-2"
          >
            開啟原檔
          </a>
        )}
      </div>
    </div>
  );
}
