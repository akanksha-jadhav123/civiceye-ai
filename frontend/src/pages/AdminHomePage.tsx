import { useAuth } from '../features/auth/AuthContext';

export default function AdminHomePage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-bold text-blue-700">Admin Console</h1>
        <p className="text-slate-500 mt-1">
          Signed in as <b>{user?.full_name}</b> ({user?.role})
        </p>
        <p className="text-sm mt-4 text-slate-600">
          Complaint dashboard arrives in M5.
        </p>
        <button
          onClick={logout}
          className="mt-6 px-4 py-2 bg-slate-200 rounded-lg hover:bg-slate-300"
        >
          Log out
        </button>
      </div>
    </div>
  );
}