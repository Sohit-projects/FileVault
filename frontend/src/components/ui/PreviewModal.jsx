import React, { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { X, Download, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatBytes, getFileCategory, FILE_CATEGORY_COLORS } from '../../utils/fileUtils';
import FileIcon from '../ui/FileIcon';

// Setup PDF.js worker - use UNPKG CDN for reliable loading
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PreviewModal = ({ file, onClose, onDownload }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfData, setPdfData] = useState(null);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setPdfData(null);
    setNumPages(null);
    setPageNumber(1);
  }, [file?._id]);

  // Fetch PDF data for react-pdf
  useEffect(() => {
    if (!file || !file.mimeType?.includes('pdf')) return;

    const fetchPdf = async () => {
      try {
        const response = await fetch(`/api/files/${file._id}/proxy`, {
          credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to fetch PDF');
        const arrayBuffer = await response.arrayBuffer();
        setPdfData(new Uint8Array(arrayBuffer));
        setLoading(false);
      } catch (err) {
        console.error('PDF fetch error:', err);
        setLoading(false);
        setError('Failed to load PDF');
      }
    };

    fetchPdf();
  }, [file?._id, file?.mimeType]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  const onDocumentLoadError = (err) => {
    console.error('PDF load error:', err);
    setLoading(false);
    setError('Failed to load PDF');
  };

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  };

  if (!file) return null;

  const category = getFileCategory(file.mimeType);
  const colors = FILE_CATEGORY_COLORS[category];
  const isImage = file.mimeType?.startsWith('image/');
  const isVideo = file.mimeType?.startsWith('video/');
  const isAudio = file.mimeType?.startsWith('audio/');
  const isPDF = file.mimeType?.includes('pdf');
  const isText = file.mimeType?.startsWith('text/');

  const renderPreview = () => {
    if (isImage) {
      return (
        <div className="flex items-center justify-center h-full p-4 bg-black/20">
          <img
            src={file.downloadUrl}
            alt={file.name}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onLoad={() => setLoading(false)}
            onError={() => { setLoading(false); setError('Failed to load image'); }}
          />
        </div>
      );
    }

    if (isVideo) {
      return (
        <div className="flex items-center justify-center h-full p-4 bg-black/20">
          <video
            src={file.downloadUrl}
            controls
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            onLoadedData={() => setLoading(false)}
            onError={() => { setLoading(false); setError('Failed to load video'); }}
          >
            Your browser does not support video playback.
          </video>
        </div>
      );
    }

    if (isAudio) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 space-y-6">
          <div 
            className="w-32 h-32 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}
          >
            <FileIcon mimeType={file.mimeType} size={56} />
          </div>
          <audio
            src={file.downloadUrl}
            controls
            className="w-full max-w-md"
            onLoadedData={() => setLoading(false)}
            onError={() => { setLoading(false); setError('Failed to load audio'); }}
          >
            Your browser does not support audio playback.
          </audio>
        </div>
      );
    }

    if (isPDF) {
      return (
        <div className="flex flex-col h-full bg-surface-2">
          {pdfData && numPages && (
            <div className="flex items-center justify-center gap-4 p-2 border-b border-border bg-surface-1">
              <button
                onClick={goToPrevPage}
                disabled={pageNumber <= 1}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-text-secondary text-sm">
                {pageNumber} / {numPages}
              </span>
              <button
                onClick={goToNextPage}
                disabled={pageNumber >= numPages}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
          <div className="flex-1 overflow-auto flex items-start justify-center p-4">
            {pdfData ? (
              <Document
                file={{ data: pdfData }}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading={null}
                className="shadow-lg"
              >
                <Page 
                  pageNumber={pageNumber} 
                  scale={1.5}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </Document>
            ) : error ? null : (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={32} className="text-accent animate-spin" />
              </div>
            )}
          </div>
        </div>
      );
    }

    if (isText) {
      // Use proxy endpoint to bypass CORS for text file preview
      const proxyUrl = `/api/files/${file._id}/proxy`;
      return (
        <iframe
          src={proxyUrl}
          title={file.name}
          className="w-full h-full border-0 bg-surface-2"
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setError('Failed to load file'); }}
        />
      );
    }

    // Fallback - file type not previewable
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div 
          className="w-24 h-24 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}
        >
          <FileIcon mimeType={file.mimeType} size={48} />
        </div>
        <p className="text-text-primary font-medium mb-2">{file.name}</p>
        <p className="text-text-muted text-sm mb-6">{formatBytes(file.size)}</p>
        <p className="text-text-muted text-sm">This file type cannot be previewed</p>
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDownload();
          }} 
          className="btn-primary mt-6"
        >
          <Download size={16} className="mr-2" />
          Download File
        </button>
      </div>
    );
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div className="relative w-[90vw] h-[90vh] max-w-6xl bg-surface-1 border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-2/50">
          <div className="flex items-center gap-3 min-w-0">
            <div 
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}
            >
              <FileIcon mimeType={file.mimeType} size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-text-primary font-medium text-sm truncate">{file.name}</p>
              <p className="text-text-muted text-xs">{formatBytes(file.size)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDownload();
              }}
              className="btn-secondary py-1.5 px-3 text-sm flex items-center gap-2"
            >
              <Download size={14} />
              Download
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-3 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-1 z-10">
              <Loader2 size={32} className="text-accent animate-spin" />
            </div>
          )}
          
          {error && !loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-1">
              <div className="text-center">
                <p className="text-danger mb-2">{error}</p>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDownload();
                  }} 
                  className="btn-primary text-sm"
                >
                  Download Instead
                </button>
              </div>
            </div>
          )}
          
          {!error && renderPreview()}
        </div>
      </div>
    </div>
  );
};

export default PreviewModal;
