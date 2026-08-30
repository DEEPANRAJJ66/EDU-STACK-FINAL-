import React, { useMemo, useState } from 'react';
import { Test, TestFolder, TeacherStats } from '../types';
import {
  Plus,
  BookOpen,
  CheckCircle2,
  FileEdit,
  Copy,
  Eye,
  Trash2,
  Clock,
  Layers,
  Users,
  BarChart3,
  Search,
  Folder,
  FolderPlus,
  FolderOpen,
  ChevronRight,
  Home,
  MoreVertical,
  Pencil,
  FolderInput,
  X,
} from 'lucide-react';

interface TeacherDashboardProps {
  tests: Test[];
  folders: TestFolder[];
  stats: TeacherStats;
  onCreateTest: (folderId?: string | null) => void;
  onEditTest: (testId: string) => void;
  onDuplicateTest: (testId: string) => void;
  onPreviewTest: (testId: string) => void;
  onViewResults: (testId?: string) => void;
  onTogglePublish: (testId: string, currentStatus: string) => void;
  onDeleteTest: (testId: string) => void;
  onCreateFolder: (name: string, parentId: string | null) => void;
  onRenameFolder: (folderId: string, name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onMoveFolder: (folderId: string, parentId: string | null) => void;
  onMoveTest: (testId: string, folderId: string | null) => void;
  loading?: boolean;
}

// A tiny modal for naming a new folder or renaming an existing one.
const FolderNameModal: React.FC<{
  title: string;
  initialName?: string;
  onCancel: () => void;
  onConfirm: (name: string) => void;
}> = ({ title, initialName = '', onCancel, onConfirm }) => {
  const [name, setName] = useState(initialName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onConfirm(name.trim());
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button type="button" onClick={onCancel} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Folder name"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-sm transition"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
};

// A folder-tree picker used to move a test or a folder somewhere else, similar to a
// "Move to..." dialog in a file manager. Invalid destinations (a folder moving into
// itself or one of its own descendants) are excluded.
const MoveModal: React.FC<{
  title: string;
  folders: TestFolder[];
  currentParentId: string | null;
  disabledFolderIds?: Set<string>;
  onCancel: () => void;
  onConfirm: (destinationId: string | null) => void;
}> = ({ title, folders, currentParentId, disabledFolderIds, onCancel, onConfirm }) => {
  const [selected, setSelected] = useState<string | null>(currentParentId);

  const renderTree = (parentId: string | null, depth: number): React.ReactNode => {
    const children = folders.filter(f => (f.parentId ?? null) === parentId);
    if (children.length === 0) return null;

    return children.map(folder => {
      const isDisabled = disabledFolderIds?.has(folder.id);
      return (
        <React.Fragment key={folder.id}>
          <button
            type="button"
            disabled={isDisabled}
            onClick={() => setSelected(folder.id)}
            style={{ paddingLeft: `${12 + depth * 18}px` }}
            className={`w-full flex items-center gap-2 py-2 pr-3 rounded-lg text-left text-xs font-semibold transition ${
              isDisabled
                ? 'text-slate-300 cursor-not-allowed'
                : selected === folder.id
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Folder className={`w-4 h-4 shrink-0 ${isDisabled ? 'text-slate-300' : 'text-amber-500'}`} />
            <span className="truncate">{folder.name}</span>
          </button>
          {renderTree(folder.id, depth + 1)}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button type="button" onClick={onCancel} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-72 overflow-y-auto border border-slate-200 rounded-lg p-1.5 space-y-0.5">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className={`w-full flex items-center gap-2 py-2 px-3 rounded-lg text-left text-xs font-semibold transition ${
              selected === null ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Home className="w-4 h-4 shrink-0 text-slate-400" />
            <span>My Tests (Root)</span>
          </button>
          {renderTree(null, 1)}
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(selected)}
            className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition"
          >
            Move Here
          </button>
        </div>
      </div>
    </div>
  );
};

// Small "⋮" dropdown menu used on mobile cards for folder/test actions.
const ActionMenu: React.FC<{
  items: { label: string; icon: React.ReactNode; onClick: () => void; danger?: boolean }[];
  onClose: () => void;
}> = ({ items, onClose }) => {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-8 z-50 w-44 bg-white rounded-xl border border-slate-200 shadow-lg py-1.5 overflow-hidden">
        {items.map((item, idx) => (
          <button
            key={idx}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={`w-full flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-left transition ${
              item.danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    </>
  );
};

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  tests = [],
  folders = [],
  stats = { totalTests: 0, publishedTests: 0, draftTests: 0, totalStudents: 0, totalAttempts: 0 },
  onCreateTest,
  onEditTest,
  onDuplicateTest,
  onPreviewTest,
  onViewResults,
  onTogglePublish,
  onDeleteTest,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveFolder,
  onMoveTest,
  loading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [folderModal, setFolderModal] = useState<
    { mode: 'create' } | { mode: 'rename'; folderId: string; initialName: string } | null
  >(null);
  const [moveModal, setMoveModal] = useState<
    { type: 'test'; id: string; currentFolderId: string | null } | { type: 'folder'; id: string; currentParentId: string | null } | null
  >(null);

  const folderById = useMemo(() => {
    const map = new Map<string, TestFolder>();
    folders.forEach(f => map.set(f.id, f));
    return map;
  }, [folders]);

  // Walk parentId links up to the root to build the breadcrumb trail.
  const breadcrumbPath = useMemo(() => {
    const path: TestFolder[] = [];
    let cursor = currentFolderId ? folderById.get(currentFolderId) : undefined;
    const guard = new Set<string>();
    while (cursor && !guard.has(cursor.id)) {
      path.unshift(cursor);
      guard.add(cursor.id);
      cursor = cursor.parentId ? folderById.get(cursor.parentId) : undefined;
    }
    return path;
  }, [currentFolderId, folderById]);

  // All descendant folder ids of a folder (used to block moving a folder into its own subtree).
  const getDescendantFolderIds = (folderId: string): Set<string> => {
    const result = new Set<string>([folderId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const f of folders) {
        if (f.parentId && result.has(f.parentId) && !result.has(f.id)) {
          result.add(f.id);
          changed = true;
        }
      }
    }
    return result;
  };

  const matchesFilters = (t: Test) => {
    if (searchTerm && !t.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (typeFilter !== 'ALL' && t.testType !== typeFilter) return false;
    return true;
  };

  const isSearching = searchTerm.trim().length > 0;

  const visibleFolders = isSearching
    ? folders.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : folders.filter(f => (f.parentId ?? null) === currentFolderId);

  const visibleTests = (isSearching ? tests : tests.filter(t => (t.folderId ?? null) === currentFolderId)).filter(
    matchesFilters
  );

  const isEmpty = visibleFolders.length === 0 && visibleTests.length === 0;

  const handleFolderModalConfirm = (name: string) => {
    if (folderModal?.mode === 'create') {
      onCreateFolder(name, currentFolderId);
    } else if (folderModal?.mode === 'rename') {
      onRenameFolder(folderModal.folderId, name);
    }
    setFolderModal(null);
  };

  const handleMoveConfirm = (destinationId: string | null) => {
    if (moveModal?.type === 'test') {
      onMoveTest(moveModal.id, destinationId);
    } else if (moveModal?.type === 'folder') {
      onMoveFolder(moveModal.id, destinationId);
    }
    setMoveModal(null);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header & Prominent Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Teacher Management Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Author and orchestrate JEE Main mock test series, manage questions, and evaluate results.
          </p>
        </div>

        <button
          onClick={() => onCreateTest(currentFolderId)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-md hover:shadow-lg transition cursor-pointer shrink-0"
        >
          <Plus className="w-5 h-5" />
          <span>Create Test</span>
        </button>
      </div>

      {/* 5 Key Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Total Tests</span>
            <BookOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.totalTests}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">In your repository</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Published Tests</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{stats.publishedTests}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Live for students</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Draft Tests</span>
            <FileEdit className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600">{stats.draftTests}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Under preparation</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Total Students</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.totalStudents}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Enrolled candidates</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Total Attempts</span>
            <BarChart3 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-600">{stats.totalAttempts}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Exams submitted</div>
        </div>
      </div>

      {/* Tests Table Header & Controls */}
      <div className="space-y-4">
        {/* Breadcrumbs */}
        {!isSearching && (
          <div className="flex items-center flex-wrap gap-1 text-xs font-bold text-slate-500">
            <button
              onClick={() => setCurrentFolderId(null)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg transition ${
                currentFolderId === null ? 'text-indigo-700 bg-indigo-50' : 'hover:text-indigo-600 hover:bg-slate-100'
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              My Tests
            </button>
            {breadcrumbPath.map(folder => (
              <React.Fragment key={folder.id}>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                <button
                  onClick={() => setCurrentFolderId(folder.id)}
                  className={`px-2 py-1 rounded-lg transition truncate max-w-[160px] ${
                    currentFolderId === folder.id ? 'text-indigo-700 bg-indigo-50' : 'hover:text-indigo-600 hover:bg-slate-100'
                  }`}
                >
                  {folder.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search test by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700"
            >
              <option value="ALL">All Subjects / Types</option>
              <option value="JEE_MAIN_FULL">Full JEE Main Mock</option>
              <option value="PHYSICS">Physics</option>
              <option value="CHEMISTRY">Chemistry</option>
              <option value="MATHEMATICS">Mathematics</option>
              <option value="CUSTOM">Custom</option>
            </select>

            <button
              onClick={() => setFolderModal({ mode: 'create' })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Create Folder</span>
            </button>
          </div>
        </div>

        {/* Folder + Tests List Card / Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500">Loading tests...</div>
          ) : isEmpty ? (
            <div className="p-12 text-center space-y-3">
              <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">
                {isSearching ? 'No results found' : 'This folder is empty'}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {isSearching
                  ? 'No folders or tests match your search term.'
                  : 'Create a folder to organize tests, or click "Create Test" above to build one here.'}
              </p>
              {!isSearching && (
                <button
                  onClick={() => onCreateTest(currentFolderId)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  + Create Your First Test
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop table view */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-5 py-3.5">Name</th>
                      <th className="px-5 py-3.5">Subject / Type</th>
                      <th className="px-5 py-3.5">Duration</th>
                      <th className="px-5 py-3.5">Questions</th>
                      <th className="px-5 py-3.5">Attempts</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {visibleFolders.map((folder) => {
                      const subCount =
                        folders.filter(f => f.parentId === folder.id).length +
                        tests.filter(t => (t.folderId ?? null) === folder.id).length;
                      return (
                        <tr key={`folder_${folder.id}`} className="hover:bg-slate-50/70 transition">
                          <td className="px-5 py-4" colSpan={6}>
                            <button
                              onClick={() => {
                                setCurrentFolderId(folder.id);
                                setSearchTerm('');
                              }}
                              className="flex items-center gap-2 text-left"
                            >
                              <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                              <span className="font-bold text-slate-900 text-sm">{folder.name}</span>
                              <span className="text-[11px] text-slate-400">
                                {subCount} item{subCount !== 1 ? 's' : ''}
                              </span>
                              {isSearching && (
                                <span className="text-[11px] text-slate-400">
                                  in{' '}
                                  {folder.parentId ? folderById.get(folder.parentId)?.name || 'My Tests' : 'My Tests'}
                                </span>
                              )}
                            </button>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() =>
                                  setFolderModal({ mode: 'rename', folderId: folder.id, initialName: folder.name })
                                }
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition"
                                title="Rename Folder"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  setMoveModal({ type: 'folder', id: folder.id, currentParentId: folder.parentId ?? null })
                                }
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition"
                                title="Move Folder"
                              >
                                <FolderInput className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Delete "${folder.name}"? Tests and subfolders inside will move to its parent location, not be deleted.`
                                    )
                                  ) {
                                    onDeleteFolder(folder.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                title="Delete Folder"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {visibleTests.map((test) => {
                      const isPublished = test.status === 'PUBLISHED';

                      return (
                        <tr key={test.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-5 py-4">
                            <div className="font-bold text-slate-900 text-sm">{test.title}</div>
                            <div className="text-[11px] text-slate-400 line-clamp-1 max-w-md mt-0.5">
                              {isSearching && test.folderId
                                ? `In ${folderById.get(test.folderId)?.name || 'a folder'} · `
                                : ''}
                              {test.description || 'No description provided'}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200">
                              {test.testType.replace(/_/g, ' ')}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>{test.durationMinutes} mins</span>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1 font-bold text-slate-800">
                              <Layers className="w-3.5 h-3.5 text-indigo-500" />
                              <span>{test.questionCount || test.totalQuestions || 0} Qs</span>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            <span>{test.attemptCount || 0} submitted</span>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 border ${
                                isPublished
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : test.status === 'UNPUBLISHED'
                                  ? 'bg-slate-100 text-slate-600 border-slate-300'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isPublished ? 'bg-emerald-500' : test.status === 'UNPUBLISHED' ? 'bg-slate-400' : 'bg-amber-500'
                                }`}
                              />
                              {test.status}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => onEditTest(test.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold transition text-xs flex items-center gap-1"
                                title="Edit Test and Questions"
                              >
                                <FileEdit className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>

                              <button
                                onClick={() => onPreviewTest(test.id)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition"
                                title="Preview CBT Interface"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => onDuplicateTest(test.id)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition"
                                title="Duplicate Test"
                              >
                                <Copy className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() =>
                                  setMoveModal({ type: 'test', id: test.id, currentFolderId: test.folderId ?? null })
                                }
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition"
                                title="Move Test"
                              >
                                <FolderInput className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => onViewResults(test.id)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-slate-100 transition"
                                title="View Student Results"
                              >
                                <BarChart3 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => onTogglePublish(test.id, test.status)}
                                className={`px-2 py-1 rounded-lg text-xs font-bold transition ${
                                  isPublished
                                    ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                                }`}
                                title={isPublished ? 'Unpublish Test' : 'Publish Test'}
                              >
                                {isPublished ? 'Unpublish' : 'Publish'}
                              </button>

                              <button
                                onClick={() => onDeleteTest(test.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                title="Delete Test"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile card / list view */}
              <div className="sm:hidden divide-y divide-slate-100">
                {visibleFolders.map((folder) => {
                  const subCount =
                    folders.filter(f => f.parentId === folder.id).length +
                    tests.filter(t => (t.folderId ?? null) === folder.id).length;
                  const menuKey = `folder_${folder.id}`;
                  return (
                    <div key={menuKey} className="flex items-center justify-between px-4 py-3.5 relative">
                      <button
                        onClick={() => {
                          setCurrentFolderId(folder.id);
                          setSearchTerm('');
                        }}
                        className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                      >
                        <Folder className="w-5 h-5 text-amber-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-sm truncate">{folder.name}</div>
                          <div className="text-[11px] text-slate-400">
                            {subCount} item{subCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </button>
                      <div className="relative shrink-0">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === menuKey ? null : menuKey)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {openMenuId === menuKey && (
                          <ActionMenu
                            onClose={() => setOpenMenuId(null)}
                            items={[
                              {
                                label: 'Open',
                                icon: <FolderOpen className="w-3.5 h-3.5" />,
                                onClick: () => {
                                  setCurrentFolderId(folder.id);
                                  setSearchTerm('');
                                },
                              },
                              {
                                label: 'Rename',
                                icon: <Pencil className="w-3.5 h-3.5" />,
                                onClick: () =>
                                  setFolderModal({ mode: 'rename', folderId: folder.id, initialName: folder.name }),
                              },
                              {
                                label: 'Move',
                                icon: <FolderInput className="w-3.5 h-3.5" />,
                                onClick: () =>
                                  setMoveModal({ type: 'folder', id: folder.id, currentParentId: folder.parentId ?? null }),
                              },
                              {
                                label: 'Delete',
                                icon: <Trash2 className="w-3.5 h-3.5" />,
                                danger: true,
                                onClick: () => {
                                  if (
                                    window.confirm(
                                      `Delete "${folder.name}"? Tests and subfolders inside will move to its parent location, not be deleted.`
                                    )
                                  ) {
                                    onDeleteFolder(folder.id);
                                  }
                                },
                              },
                            ]}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}

                {visibleTests.map((test) => {
                  const isPublished = test.status === 'PUBLISHED';
                  const menuKey = `test_${test.id}`;
                  return (
                    <div key={menuKey} className="px-4 py-3.5 relative">
                      <div className="flex items-start justify-between gap-2">
                        <button onClick={() => onEditTest(test.id)} className="flex items-start gap-2.5 min-w-0 flex-1 text-left">
                          <FileEdit className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-sm truncate">{test.title}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {test.testType.replace(/_/g, ' ')} · {test.durationMinutes} mins ·{' '}
                              {test.questionCount || test.totalQuestions || 0} Qs
                              {isSearching && test.folderId && (
                                <> · in {folderById.get(test.folderId)?.name || 'a folder'}</>
                              )}
                            </div>
                            <span
                              className={`mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isPublished
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : test.status === 'UNPUBLISHED'
                                  ? 'bg-slate-100 text-slate-600 border-slate-300'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {test.status}
                            </span>
                          </div>
                        </button>
                        <div className="relative shrink-0">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === menuKey ? null : menuKey)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                          {openMenuId === menuKey && (
                            <ActionMenu
                              onClose={() => setOpenMenuId(null)}
                              items={[
                                { label: 'Edit', icon: <FileEdit className="w-3.5 h-3.5" />, onClick: () => onEditTest(test.id) },
                                { label: 'Preview', icon: <Eye className="w-3.5 h-3.5" />, onClick: () => onPreviewTest(test.id) },
                                {
                                  label: 'Duplicate',
                                  icon: <Copy className="w-3.5 h-3.5" />,
                                  onClick: () => onDuplicateTest(test.id),
                                },
                                {
                                  label: 'Move',
                                  icon: <FolderInput className="w-3.5 h-3.5" />,
                                  onClick: () =>
                                    setMoveModal({ type: 'test', id: test.id, currentFolderId: test.folderId ?? null }),
                                },
                                {
                                  label: 'Results',
                                  icon: <BarChart3 className="w-3.5 h-3.5" />,
                                  onClick: () => onViewResults(test.id),
                                },
                                {
                                  label: isPublished ? 'Unpublish' : 'Publish',
                                  icon: <CheckCircle2 className="w-3.5 h-3.5" />,
                                  onClick: () => onTogglePublish(test.id, test.status),
                                },
                                {
                                  label: 'Delete',
                                  icon: <Trash2 className="w-3.5 h-3.5" />,
                                  danger: true,
                                  onClick: () => onDeleteTest(test.id),
                                },
                              ]}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {folderModal && (
        <FolderNameModal
          title={folderModal.mode === 'create' ? 'New Folder' : 'Rename Folder'}
          initialName={folderModal.mode === 'rename' ? folderModal.initialName : ''}
          onCancel={() => setFolderModal(null)}
          onConfirm={handleFolderModalConfirm}
        />
      )}

      {moveModal && (
        <MoveModal
          title={moveModal.type === 'test' ? 'Move Test To...' : 'Move Folder To...'}
          folders={folders}
          currentParentId={moveModal.type === 'test' ? moveModal.currentFolderId : moveModal.currentParentId}
          disabledFolderIds={moveModal.type === 'folder' ? getDescendantFolderIds(moveModal.id) : undefined}
          onCancel={() => setMoveModal(null)}
          onConfirm={handleMoveConfirm}
        />
      )}
    </div>
  );
};
