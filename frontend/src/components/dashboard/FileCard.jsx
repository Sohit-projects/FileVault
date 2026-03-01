import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Download, Trash2, Star, RotateCcw, MoreVertical,
  Eye, Edit2, Check, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { formatBytes, truncateFileName, downloadFile } from '../../utils/fileUtils';
import FileIcon from '../ui/FileIcon';

const FileCard = ({ file, onUpdate, onDelete, onPreview, view = 'grid' }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(file.name);
  const [loading, setLoading] = useState(false);

  const handleStar = async () => {
    try {
      const { data } = await api.patch(`/files/${file._id}/star`);
      onUpdate(data.data.file);
    } catch {
      toast.error('Failed to update star');
    }
  };

  const handleTrash = async () => {
    if (file.isTrashed) {
      if (!window.confirm('Permanently delete this file?')) return;
      setLoading(true);
      try {
        await api.delete(`/files/${file._id}`);
        onDelete(file._id);
        toast.success('File deleted permanently');
      } catch {
        toast.error('Failed to delete file');
      } finally {
        setLoading(false);
      }
    } else {
      try {
        const { data } = await api.patch(`/files/${file._id}/trash`);
        onUpdate(data.data.file);
        toast.success('File moved to trash');
      } catch {
        toast.error('Failed to trash file');
      }
    }
  };

  const handleRestore = async () => {
    try {
      const { data } = await api.patch(`/files/${file._id}/restore`);
      onUpdate(data.data.file);
      toast.success('File restored');
    } catch {
      toast.error('Failed to restore file');
    }
  };

  const handleDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await downloadFile(file._id, file.name);
    } catch {
      toast.error('Failed to download');
    }
  };

  const handleRename = async () => {
    if (!newName.trim() || newName === file.name) return setRenaming(false);
    setLoading(true);
    try {
      const { data } = await api.patch(`/files/${file._id}/rename`, { name: newName });
      onUpdate(data.data.file);
      setRenaming(false);
      toast.success('File renamed');
    } catch {
      toast.error('Failed to rename');
    } finally {
      setLoading(false);
    }
  };

  if (view === 'list') {
    return (
      <div 
        className="flex items-center gap-4 px-4 py-3 bg-surface-1 border border-border rounded-xl hover:border-border-light hover:bg-surface-2 transition-all duration-200 group cursor-pointer"
        onClick={() => onPreview?.(file)}
      >
        <FileIcon mimeType={file.mimeType} size={18} showBg />
        <div className="flex-1 min-w-0">
          {renaming ? (
            <div className="flex items-center gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
                className="input-field py-1.5 text-sm"
                autoFocus
              />
              <button onClick={handleRename} className="text-success hover:text-success/80"><Check size={16} /></button>
              <button onClick={() => setRenaming(false)} className="text-danger hover:text-danger/80"><X size={16} /></button>
            </div>
          ) : (
            <p className="text-text-primary text-sm font-medium truncate">{truncateFileName(file.name, 50)}</p>
          )}
          <p className="text-text-muted text-xs mt-0.5">{formatBytes(file.size)}</p>
        </div>
        <div className="text-text-muted text-xs hidden md:block">
          {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <IconBtn icon={<Eye size={14} />} onClick={() => onPreview?.(file)} title="Preview" />
          <IconBtn icon={<Download size={14} />} onClick={(e) => { e.stopPropagation(); handleDownload(e); }} title="Download" />
          <IconBtn icon={<Star size={14} className={file.isStarred ? 'fill-warning text-warning' : ''} />} onClick={handleStar} title="Star" />
          {!renaming && <IconBtn icon={<Edit2 size={14} />} onClick={() => setRenaming(true)} title="Rename" />}
          {file.isTrashed ? (
            <IconBtn icon={<RotateCcw size={14} />} onClick={handleRestore} title="Restore" />
          ) : null}
          <IconBtn icon={<Trash2 size={14} />} onClick={handleTrash} title={file.isTrashed ? 'Delete' : 'Trash'} danger />
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div 
      className="card card-hover p-4 group relative cursor-pointer"
      onClick={() => onPreview?.(file)}
    >
      {/* Top bar */}
      <div className="flex items-start justify-between mb-3" onClick={(e) => e.stopPropagation()}>
        <FileIcon mimeType={file.mimeType} size={20} showBg />
        <div className="flex items-center gap-1">
          <button
            onClick={handleStar}
            className={`p-1.5 rounded-lg transition-all ${file.isStarred ? 'text-warning' : 'text-text-muted opacity-0 group-hover:opacity-100 hover:text-warning'}`}
          >
            <Star size={14} className={file.isStarred ? 'fill-warning' : ''} />
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg text-text-muted opacity-0 group-hover:opacity-100 hover:text-text-secondary hover:bg-surface-3 transition-all"
            >
              <MoreVertical size={14} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 z-50 w-44 bg-surface-2 border border-border rounded-xl shadow-xl overflow-hidden animate-fade-in">
                <MenuItem icon={<Eye size={13} />} label="Preview" onClick={() => { onPreview?.(file); setMenuOpen(false); }} />
                <MenuItem icon={<Download size={13} />} label="Download" onClick={(e) => { handleDownload(e); setMenuOpen(false); }} />
                <MenuItem icon={<Edit2 size={13} />} label="Rename" onClick={() => { setRenaming(true); setMenuOpen(false); }} />
                {file.isTrashed ? (
                  <MenuItem icon={<RotateCcw size={13} />} label="Restore" onClick={() => { handleRestore(); setMenuOpen(false); }} />
                ) : null}
                <div className="border-t border-border" />
                <MenuItem icon={<Trash2 size={13} />} label={file.isTrashed ? 'Delete Forever' : 'Move to Trash'} onClick={() => { handleTrash(); setMenuOpen(false); }} danger />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* File name */}
      {renaming ? (
        <div className="space-y-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
            className="input-field py-1.5 text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={handleRename} className="btn-primary py-1 px-3 text-xs">Save</button>
            <button onClick={() => setRenaming(false)} className="btn-secondary py-1 px-3 text-xs">Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-text-primary text-sm font-medium mb-1 leading-tight truncate" title={file.name}>
            {truncateFileName(file.name)}
          </p>
          <div className="flex items-center justify-between text-xs text-text-muted mt-2">
            <span>{formatBytes(file.size)}</span>
            <span>{formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}</span>
          </div>
        </>
      )}

      {/* Overlay on hover */}
      {!renaming && (
        <div className="absolute inset-x-0 bottom-0 h-0 group-hover:h-10 overflow-hidden transition-all duration-200 rounded-b-2xl">
          <div className="flex bg-surface-3 border-t border-border h-10">
            <OverlayBtn icon={<Eye size={14} />} onClick={() => onPreview?.(file)} />
            <OverlayBtn icon={<Download size={14} />} onClick={(e) => handleDownload(e)} />
          </div>
        </div>
      )}

      {/* Click outside to close menu */}
      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />}
    </div>
  );
};

const IconBtn = ({ icon, onClick, title, danger = false }) => (
  <button
    onClick={onClick}
    title={title}
    className={`p-1.5 rounded-lg transition-colors ${
      danger ? 'text-text-muted hover:text-danger hover:bg-danger/10' : 'text-text-muted hover:text-text-primary hover:bg-surface-3'
    }`}
  >
    {icon}
  </button>
);

const MenuItem = ({ icon, label, onClick, danger = false }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors
      ${danger ? 'text-danger hover:bg-danger/10' : 'text-text-secondary hover:bg-surface-3 hover:text-text-primary'}`}
  >
    {icon}
    {label}
  </button>
);

const OverlayBtn = ({ icon, onClick }) => (
  <button
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick(e);
    }}
    className="flex-1 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-4 transition-colors"
  >
    {icon}
  </button>
);

export default FileCard;
