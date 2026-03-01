import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, Outlet } from 'react-router-dom';
import {
  Grid3X3, List, Search, SortAsc, SortDesc,
  Filter, X, Loader2, FolderOpen, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { downloadFile } from '../utils/fileUtils';
import Sidebar from '../components/dashboard/Sidebar';
import FileCard from '../components/dashboard/FileCard';
import FileUpload from '../components/dashboard/FileUpload';
import PreviewModal from '../components/ui/PreviewModal';
import { useAuth } from '../context/AuthContext';

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date Added' },
  { value: 'name', label: 'Name' },
  { value: 'size', label: 'Size' },
  { value: 'downloadCount', label: 'Downloads' },
];

const Dashboard = () => {
  const { user, refetchUser } = useAuth();
  const location = useLocation();

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showUpload, setShowUpload] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [previewFile, setPreviewFile] = useState(null);

  const isTrash = location.pathname.includes('/trash');
  const isStarred = location.pathname.includes('/starred');
  const isRecent = location.pathname.includes('/recent');

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 20,
        sortBy: isRecent ? 'createdAt' : sortBy,
        sortOrder: 'desc',
        ...(isTrash ? { trashed: 'true' } : { trashed: 'false' }),
        ...(isStarred ? { starred: 'true' } : {}),
        ...(search ? { search } : {}),
      };

      const { data } = await api.get('/files', { params });
      setFiles(data.data.files);
      setTotalPages(data.data.pagination.totalPages);
      setTotal(data.data.pagination.total);
    } catch (err) {
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  }, [page, sortBy, sortOrder, search, isTrash, isStarred, isRecent]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpdate = (updatedFile) => {
    setFiles((prev) =>
      prev.map((f) => (f._id === updatedFile._id ? updatedFile : f))
        .filter((f) => {
          if (isTrash) return f.isTrashed;
          if (isStarred) return f.isStarred;
          return !f.isTrashed;
        })
    );
  };

  const handleDelete = (id) => {
    setFiles((prev) => prev.filter((f) => f._id !== id));
    refetchUser();
  };

  const handleUploadComplete = () => {
    setShowUpload(false);
    fetchFiles();
    refetchUser();
  };

  const pageTitle = isTrash ? 'Trash' : isStarred ? 'Starred' : isRecent ? 'Recent Files' : 'All Files';

  return (
    <div className="flex h-screen overflow-hidden bg-surface-0">
      <Sidebar onUploadClick={() => setShowUpload(true)} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className=" flex-shrink-0 border-b border-border backdrop-blur-sm px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-bold text-text-primary">{pageTitle}</h1>

            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search files..."
                  className="input-field pl-9 py-2 text-sm"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input-field py-2 text-sm w-36"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              <button
                onClick={() => setSortOrder((o) => o === 'desc' ? 'asc' : 'desc')}
                className="btn-secondary py-2 px-3"
                title={sortOrder === 'desc' ? 'Ascending' : 'Descending'}
              >
                {sortOrder === 'desc' ? <SortDesc size={15} /> : <SortAsc size={15} />}
              </button>

              {/* View toggle */}
              <div className="flex items-center bg-surface-2 border border-border rounded-xl overflow-hidden">
                <button
                  onClick={() => setView('grid')}
                  className={`p-2.5 transition-colors ${view === 'grid' ? 'bg-surface-3 text-accent' : 'text-text-muted hover:text-text-primary'}`}
                >
                  <Grid3X3 size={15} />
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`p-2.5 transition-colors ${view === 'list' ? 'bg-surface-3 text-accent' : 'text-text-muted hover:text-text-primary'}`}
                >
                  <List size={15} />
                </button>
              </div>

              <button onClick={fetchFiles} className="btn-secondary py-2 px-3" title="Refresh">
                <RefreshCw size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Upload panel */}
        {showUpload && (
          <div className="flex-shrink-0 border-b border-border bg-surface-1 p-6 animate-fade-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-primary">Upload Files</h3>
              <button onClick={() => setShowUpload(false)} className="text-text-muted hover:text-text-primary">
                <X size={18} />
              </button>
            </div>
            <FileUpload onUploadComplete={handleUploadComplete} />
          </div>
        )}

        {/* Files area */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 size={24} className="text-accent animate-spin" />
            </div>
          ) : files.length === 0 ? (
            <EmptyState isTrash={isTrash} isStarred={isStarred} search={search} onUpload={() => setShowUpload(true)} />
          ) : (
            <>
              <p className="text-text-muted text-sm mb-4">{total} file{total !== 1 ? 's' : ''}</p>

              {view === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 animate-fade-in">
                  {files.map((file) => (
                    <FileCard 
                    key={file._id} 
                    file={file} 
                    onUpdate={handleUpdate} 
                    onDelete={handleDelete} 
                    onPreview={setPreviewFile}
                    view="grid" 
                  />
                  ))}
                </div>
              ) : (
                <div className="space-y-2 animate-fade-in">
                  <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2 text-text-muted text-xs font-medium uppercase tracking-wider border-b border-border mb-2">
                    <span>Name</span>
                    <span>Size</span>
                    <span>Modified</span>
                    <span>Actions</span>
                  </div>
                  {files.map((file) => (
                    <FileCard 
                    key={file._id} 
                    file={file} 
                    onUpdate={handleUpdate} 
                    onDelete={handleDelete}
                    onPreview={setPreviewFile}
                    view="list" 
                  />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="btn-secondary py-2 px-4 text-sm disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-text-muted text-sm">Page {page} of {totalPages}</span>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="btn-secondary py-2 px-4 text-sm disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      {/* Preview Modal */}
      {previewFile && (
        <PreviewModal 
          file={previewFile} 
          onClose={() => setPreviewFile(null)}
          onDownload={async () => {
            try {
              await downloadFile(previewFile._id, previewFile.name);
            } catch {
              toast.error('Failed to download');
            }
          }}
        />
      )}
    </div>
  );
};

const EmptyState = ({ isTrash, isStarred, search, onUpload }) => (
  <div className="flex flex-col items-center justify-center h-64 text-center animate-fade-in">
    <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-4">
      <FolderOpen size={28} className="text-text-muted" />
    </div>
    <h3 className="text-text-primary font-semibold mb-2">
      {search ? 'No files found' : isTrash ? 'Trash is empty' : isStarred ? 'No starred files' : 'No files yet'}
    </h3>
    <p className="text-text-muted text-sm mb-6">
      {search ? `No files match "${search}"` : isTrash ? 'Files you delete will appear here' : isStarred ? 'Star files to find them quickly' : 'Upload your first file to get started'}
    </p>
    {!isTrash && !isStarred && !search && (
      <button onClick={onUpload} className="btn-primary">
        Upload Files
      </button>
    )}
  </div>
);

export default Dashboard;
