import React, { useState } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../providers/AuthProvider";
import { UserPlus, Trash2, Edit2, Download, Upload, Eye, EyeOff } from "lucide-react";

export default function UsersManagementPage() {
  const { users, adminUpdateUser, adminDeleteUser, adminAddUser } = useAuth();
  const [editingId, setEditingId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswords, setShowPasswords] = useState({});

  // Filter only system users (not teachers/applicants)
  const systemUsers = users.filter(u => 
    ["Admin", "ECAE Manager", "ECAE Trainer", "Auditor"].includes(u.role)
  );

  function handleEdit(user) {
    setEditingId(user.email);
  }

  function handleSave(user) {
    adminUpdateUser(user.email, user);
    setEditingId(null);
  }

  function handleDelete(email) {
    if (window.confirm(`Delete user ${email}? This cannot be undone.`)) {
      adminDeleteUser(email);
    }
  }

  function downloadUsersJSON() {
    const data = JSON.stringify(systemUsers, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function uploadUsersJSON(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) throw new Error('Invalid format');
        
        // Update localStorage directly
        localStorage.setItem("fg.users", JSON.stringify(data));
        alert(`✅ Uploaded ${data.length} users. Refresh the page to apply changes.`);
        window.location.reload();
      } catch (err) {
        alert('❌ Invalid JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  function togglePasswordVisibility(email) {
    setShowPasswords(prev => ({ ...prev, [email]: !prev[email] }));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Users Management</h1>
          <p className="text-sm text-slate-500">Manage login credentials and roles</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadUsersJSON}
            className="flex items-center gap-2 rounded-xl border px-4 py-2 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Download users.json
          </button>
          <label className="flex items-center gap-2 rounded-xl border px-4 py-2 hover:bg-slate-50 cursor-pointer">
            <Upload className="h-4 w-4" />
            Upload users.json
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadUsersJSON(e.target.files[0])}
            />
          </label>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700"
          >
            <UserPlus className="h-4 w-4" />
            Add User
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="rounded-xl border bg-blue-50 p-4">
        <h3 className="font-semibold text-blue-900 mb-2">💡 How to Update Users Without Rebuild:</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Click <strong>"Download users.json"</strong> to get current users</li>
          <li>Edit the JSON file with your preferred text editor</li>
          <li>Upload <code className="bg-blue-100 px-1 rounded">users.json</code> directly to Azure via Kudu to: <code className="bg-blue-100 px-1 rounded">/site/wwwroot/users.json</code></li>
          <li>Refresh the app - new users will load automatically!</li>
        </ol>
        <p className="text-xs text-blue-600 mt-2">
          <strong>Note:</strong> Changes made here are stored in browser localStorage. To persist across all users, upload users.json to Azure.
        </p>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Password</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {systemUsers.map((user) => (
                <UserRow
                  key={user.email}
                  user={user}
                  isEditing={editingId === user.email}
                  showPassword={showPasswords[user.email]}
                  onEdit={() => handleEdit(user)}
                  onSave={handleSave}
                  onDelete={() => handleDelete(user.email)}
                  onTogglePassword={() => togglePasswordVisibility(user.email)}
                  onCancel={() => setEditingId(null)}
                />
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onAdd={(newUser) => {
            adminAddUser(newUser);
            setShowAddModal(false);
          }}
        />
      )}
    </div>
  );
}

function UserRow({ user, isEditing, showPassword, onEdit, onSave, onDelete, onTogglePassword, onCancel }) {
  const [editData, setEditData] = useState(user);

  if (isEditing) {
    return (
      <Motion.tr
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="border-t bg-blue-50"
      >
        <td className="px-4 py-3">
          <input
            type="text"
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            className="w-full rounded border px-2 py-1"
          />
        </td>
        <td className="px-4 py-3">
          <input
            type="email"
            value={editData.email}
            onChange={(e) => setEditData({ ...editData, email: e.target.value })}
            className="w-full rounded border px-2 py-1"
          />
        </td>
        <td className="px-4 py-3">
          <input
            type="text"
            value={editData.password}
            onChange={(e) => setEditData({ ...editData, password: e.target.value })}
            className="w-full rounded border px-2 py-1"
          />
        </td>
        <td className="px-4 py-3">
          <select
            value={editData.role}
            onChange={(e) => setEditData({ ...editData, role: e.target.value })}
            className="w-full rounded border px-2 py-1"
          >
            <option>Admin</option>
            <option>ECAE Manager</option>
            <option>ECAE Trainer</option>
            <option>Auditor</option>
          </select>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => onSave(editData)}
              className="rounded bg-green-600 text-white px-3 py-1 text-xs hover:bg-green-700"
            >
              Save
            </button>
            <button
              onClick={onCancel}
              className="rounded border px-3 py-1 text-xs hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </td>
      </Motion.tr>
    );
  }

  return (
    <Motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="border-t hover:bg-slate-50"
    >
      <td className="px-4 py-3">{user.name}</td>
      <td className="px-4 py-3 font-mono text-xs">{user.email}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <code className="bg-slate-100 px-2 py-1 rounded">
            {showPassword ? user.password : '••••••••'}
          </code>
          <button
            onClick={onTogglePassword}
            className="text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="inline-block px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-800">
          {user.role}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={onEdit}
            className="text-blue-600 hover:underline flex items-center gap-1"
          >
            <Edit2 className="h-3 w-3" />
            Edit
          </button>
          <button
            onClick={onDelete}
            className="text-rose-600 hover:underline flex items-center gap-1"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </button>
        </div>
      </td>
    </Motion.tr>
  );
}

function AddUserModal({ onClose, onAdd }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ECAE Trainer'
  });

  function handleSubmit(e) {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      alert('Please fill all fields');
      return;
    }
    onAdd(formData);
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-6 w-full max-w-md"
      >
        <h2 className="text-xl font-bold mb-4">Add New User</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-xl border px-3 py-2"
              placeholder="Full Name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-xl border px-3 py-2"
              placeholder="user@ese.gov.ae"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="text"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full rounded-xl border px-3 py-2"
              placeholder="Password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full rounded-xl border px-3 py-2"
            >
              <option>Admin</option>
              <option>ECAE Manager</option>
              <option>ECAE Trainer</option>
              <option>Auditor</option>
            </select>
          </div>
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="flex-1 rounded-xl bg-indigo-600 text-white py-2 hover:bg-indigo-700"
            >
              Add User
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border py-2 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </Motion.div>
    </div>
  );
}
