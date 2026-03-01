import React from 'react';
import {
  FileText, FileImage, FileVideo, FileAudio, FileArchive,
  FileSpreadsheet, Presentation, File, FileCode, FilePdf
} from 'lucide-react';
import { getFileCategory, FILE_CATEGORY_COLORS } from '../../utils/fileUtils';

const CATEGORY_ICONS = {
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  pdf: FileText,
  document: FileText,
  spreadsheet: FileSpreadsheet,
  presentation: Presentation,
  archive: FileArchive,
  text: FileCode,
  other: File,
};

const FileIcon = ({ mimeType, size = 20, className = '', showBg = false }) => {
  const category = getFileCategory(mimeType);
  const colors = FILE_CATEGORY_COLORS[category] || FILE_CATEGORY_COLORS.other;
  const Icon = CATEGORY_ICONS[category] || File;

  if (showBg) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl flex-shrink-0 ${className}`}
        style={{
          backgroundColor: colors.bg,
          border: `1px solid ${colors.border}`,
          width: size + 24,
          height: size + 24,
        }}
      >
        <Icon size={size} style={{ color: colors.text }} />
      </div>
    );
  }

  return <Icon size={size} className={className} style={{ color: colors.text }} />;
};

export default FileIcon;
