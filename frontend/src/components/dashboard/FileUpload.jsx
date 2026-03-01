import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, CheckCircle, AlertCircle, Loader2, UploadCloud } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { formatBytes } from '../../utils/fileUtils';
import FileIcon from '../ui/FileIcon';

const MAX_FILE_SIZE = parseInt(process.env.REACT_APP_MAX_FILE_SIZE_MB || '100') * 1024 * 1024;

const FileUpload = ({ folder = 'root', onUploadComplete }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback((accepted, rejected) => {
    rejected.forEach((f) => {
      f.errors.forEach((e) => toast.error(`${f.file.name}: ${e.message}`));
    });

    const newFiles = accepted.map((file) => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending', // pending | uploading | done | error
      progress: 0,
      error: null,
    }));

    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  });

  const removeFile = (id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadAll = async () => {
    const pending = files.filter((f) => f.status === 'pending');
    if (!pending.length) return;

    setUploading(true);
    const formData = new FormData();
    pending.forEach((f) => formData.append('files', f.file));
    formData.append('folder', folder);

    // Mark as uploading
    setFiles((prev) =>
      prev.map((f) => (f.status === 'pending' ? { ...f, status: 'uploading' } : f))
    );

    try {
      const { data } = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          const progress = Math.round((e.loaded * 100) / e.total);
          setFiles((prev) =>
            prev.map((f) => (f.status === 'uploading' ? { ...f, progress } : f))
          );
        },
      });

      const uploadedNames = data.data.files.map((f) => f.originalName);
      const errorNames = data.data.errors?.map((e) => e.file) || [];

      setFiles((prev) =>
        prev.map((f) => {
          if (uploadedNames.includes(f.file.name)) return { ...f, status: 'done', progress: 100 };
          if (errorNames.includes(f.file.name)) return { ...f, status: 'error', error: 'Upload failed' };
          return f;
        })
      );

      toast.success(`${data.data.files.length} file(s) uploaded!`);
      if (onUploadComplete) onUploadComplete(data.data.files);
    } catch (err) {
      setFiles((prev) =>
        prev.map((f) => (f.status === 'uploading' ? { ...f, status: 'error', error: err.response?.data?.message || 'Upload failed' } : f))
      );
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const clearDone = () => setFiles((prev) => prev.filter((f) => f.status !== 'done'));

  const hasPending = files.some((f) => f.status === 'pending');

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200
          ${isDragActive && !isDragReject ? 'border-accent bg-accent/5 scale-[1.01]' : ''}
          ${isDragReject ? 'border-danger bg-danger/5' : ''}
          ${!isDragActive ? 'border-border hover:border-border-light hover:bg-surface-2' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
            isDragActive ? 'bg-accent/20 scale-110' : 'bg-surface-3'
          }`}>
            <UploadCloud size={24} className={isDragActive ? 'text-accent' : 'text-text-muted'} />
          </div>
          <div>
            <p className="text-text-primary font-semibold">
              {isDragActive ? 'Drop files here' : 'Drop files or click to browse'}
            </p>
            <p className="text-text-muted text-sm mt-1">
              Up to 10 files · Max {process.env.REACT_APP_MAX_FILE_SIZE_MB || '100'}MB each
            </p>
          </div>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary text-sm font-medium">{files.length} file(s)</span>
            <button onClick={clearDone} className="text-xs text-text-muted hover:text-text-secondary transition-colors">
              Clear done
            </button>
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {files.map((f) => (
              <div key={f.id} className="flex items-center gap-3 bg-surface-2 border border-border rounded-xl px-3 py-2.5">
                <FileIcon mimeType={f.file.type} size={16} />
                <div className="flex-1 min-w-0">
                  <p className="text-text-primary text-sm font-medium truncate">{f.file.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted text-xs">{formatBytes(f.file.size)}</span>
                    {f.status === 'uploading' && (
                      <div className="flex-1 h-1 bg-surface-4 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent rounded-full transition-all duration-300"
                          style={{ width: `${f.progress}%` }}
                        />
                      </div>
                    )}
                    {f.status === 'error' && (
                      <span className="text-danger text-xs">{f.error}</span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {f.status === 'done' && <CheckCircle size={16} className="text-success" />}
                  {f.status === 'error' && <AlertCircle size={16} className="text-danger" />}
                  {f.status === 'uploading' && <Loader2 size={16} className="text-accent animate-spin" />}
                  {f.status === 'pending' && (
                    <button onClick={() => removeFile(f.id)} className="text-text-muted hover:text-danger transition-colors">
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {hasPending && (
            <button onClick={uploadAll} disabled={uploading} className="btn-primary w-full justify-center">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploading ? 'Uploading...' : `Upload ${files.filter((f) => f.status === 'pending').length} file(s)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
