"use client";

import { useState, useEffect } from "react";

// Types
interface Repository {
  id: string;
  owner: string;
  name: string;
  github_id: number;
  is_active: boolean;
}

interface IssueTriage {
  id: string;
  repo_id: string;
  issue_number: number;
  title: string;
  body: string | null;
  state: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null;
  is_duplicate: boolean;
  duplicate_issue_number: number | null;
  missing_information: string[];
  suggested_labels: string[];
  rationale: string | null;
  suggested_maintainer_response: string | null;
  github_created_at: string;
  triaged_at: string | null;
}

export default function Home() {
  const API_HOST = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // State
  const [activeTab, setActiveTab] = useState<"dashboard" | "connect" | "queue">("dashboard");
  const [repos, setRepos] = useState<Repository[]>([]);
  const [issues, setIssues] = useState<IssueTriage[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<IssueTriage | null>(null);
  
  // Filters
  const [selectedRepoFilter, setSelectedRepoFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [duplicateFilter, setDuplicateFilter] = useState<string>("");

  // Connect Repo Form
  const [owner, setOwner] = useState("");
  const [repoName, setRepoName] = useState("");
  const [pat, setPat] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [connectSuccess, setConnectSuccess] = useState(false);

  // General Loading/Errors
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);
  const [triageLoadingId, setTriageLoadingId] = useState<string | null>(null);

  // Fetch Connected Repositories
  const fetchRepos = async () => {
    setIsLoadingRepos(true);
    try {
      const res = await fetch(`${API_HOST}/api/repos`);
      if (res.ok) {
        const data = await res.json();
        setRepos(data);
      }
    } catch (err) {
      console.error("Failed to fetch repositories", err);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  // Fetch Issues
  const fetchIssues = async () => {
    setIsLoadingIssues(true);
    try {
      let url = `${API_HOST}/api/issues`;
      const params = new URLSearchParams();
      if (selectedRepoFilter) params.append("repo_id", selectedRepoFilter);
      if (priorityFilter) params.append("priority", priorityFilter);
      if (duplicateFilter === "yes") params.append("is_duplicate", "true");
      if (duplicateFilter === "no") params.append("is_duplicate", "false");
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setIssues(data);
      }
    } catch (err) {
      console.error("Failed to fetch issues", err);
    } finally {
      setIsLoadingIssues(false);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  useEffect(() => {
    fetchIssues();
  }, [selectedRepoFilter, priorityFilter, duplicateFilter]);

  // Connect Repo
  const handleConnectRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    setConnectError("");
    setConnectSuccess(false);

    try {
      const res = await fetch(`${API_HOST}/api/repos/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, name: repoName, pat }),
      });

      if (res.ok) {
        setConnectSuccess(true);
        setOwner("");
        setRepoName("");
        setPat("");
        fetchRepos();
        setTimeout(() => {
          setActiveTab("queue");
          setConnectSuccess(false);
        }, 1500);
      } else {
        const errData = await res.json();
        setConnectError(errData.detail || "Connection failed. Please check repository details and PAT.");
      }
    } catch (err) {
      setConnectError("Network error. Make sure backend is running.");
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect Repo
  const handleDisconnectRepo = async (repoId: string) => {
    if (!confirm("Are you sure you want to disconnect this repository? All triaged issue records will remain in the database but webhook sync will stop.")) return;
    try {
      const res = await fetch(`${API_HOST}/api/repos/${repoId}`, { method: "DELETE" });
      if (res.ok) {
        fetchRepos();
        if (selectedRepoFilter === repoId) setSelectedRepoFilter("");
      }
    } catch (err) {
      console.error("Failed to disconnect repository", err);
    }
  };

  // Trigger manual triage
  const handleTriggerTriage = async (issueId: string) => {
    setTriageLoadingId(issueId);
    let res: Response | null = null;
    try {
      res = await fetch(`${API_HOST}/api/issues/${issueId}/triage`, { method: "POST" });
      if (res.ok) {
        // Poll for updates or just refresh list after a short delay
        setTimeout(() => {
          fetchIssues();
          setTriageLoadingId(null);
          // If the currently viewed issue was the one triaged, update it
          if (selectedIssue?.id === issueId) {
            fetch(`${API_HOST}/api/issues/${issueId}`)
              .then(r => r.json())
              .then(data => setSelectedIssue(data));
          }
        }, 3000);
      }
    } catch (err) {
      console.error("Triage failed", err);
    } finally {
      if (!res?.ok) {
        setTriageLoadingId(null);
      }
    }
  };

  // Helper for priority badges
  const getPriorityBadgeClass = (priority: string | null) => {
    switch (priority) {
      case "CRITICAL":
        return "bg-red-950/40 text-red-400 border border-red-800/60";
      case "HIGH":
        return "bg-orange-950/40 text-orange-400 border border-orange-800/60";
      case "MEDIUM":
        return "bg-yellow-950/40 text-yellow-400 border border-yellow-800/60";
      case "LOW":
        return "bg-green-950/40 text-green-400 border border-green-800/60";
      default:
        return "bg-zinc-800 text-zinc-400 border border-zinc-700";
    }
  };

  // Count priorities for dashboard stats
  const stats = {
    total: issues.length,
    triaged: issues.filter(i => i.triaged_at).length,
    pending: issues.filter(i => !i.triaged_at).length,
    critical: issues.filter(i => i.priority === "CRITICAL").length,
    high: issues.filter(i => i.priority === "HIGH").length,
    medium: issues.filter(i => i.priority === "MEDIUM").length,
    low: issues.filter(i => i.priority === "LOW").length,
    duplicates: issues.filter(i => i.is_duplicate).length,
    missingInfo: issues.filter(i => i.missing_information && i.missing_information.length > 0).length,
  };

  return (
    <div className="flex h-screen bg-[#0B0C10] text-zinc-100 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#12131C] border-r border-zinc-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo */}
          <div className="p-6 border-b border-zinc-800/60 flex items-center space-x-3">
            <svg className="w-8 h-8 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.905 0-5.54-1.037-7.614-2.766" />
            </svg>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">IssuePilot</span>
          </div>

          {/* Nav Items */}
          <nav className="p-4 space-y-1.5">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === "dashboard"
                  ? "bg-gradient-to-r from-indigo-600/80 to-purple-600/80 text-white shadow-md shadow-indigo-600/10 font-medium"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
              </svg>
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab("connect")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === "connect"
                  ? "bg-gradient-to-r from-indigo-600/80 to-purple-600/80 text-white shadow-md shadow-indigo-600/10 font-medium"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Connect Repo</span>
            </button>

            <button
              onClick={() => setActiveTab("queue")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === "queue"
                  ? "bg-gradient-to-r from-indigo-600/80 to-purple-600/80 text-white shadow-md shadow-indigo-600/10 font-medium"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              }`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
              </svg>
              <span>Triage Queue</span>
            </button>
          </nav>
        </div>

        {/* Connected Repos Mini List */}
        <div className="p-4 border-t border-zinc-800/60">
          <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-3 px-2">Connected Repos</div>
          {repos.length === 0 ? (
            <div className="text-xs text-zinc-600 px-2 py-1">No repositories linked yet.</div>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {repos.map(r => (
                <div key={r.id} className="flex justify-between items-center group px-2 py-1.5 rounded-lg hover:bg-zinc-800/30 transition-colors">
                  <span className="text-xs text-zinc-300 font-mono truncate max-w-[140px]">{r.owner}/{r.name}</span>
                  <button
                    onClick={() => handleDisconnectRepo(r.id)}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 text-zinc-500 p-0.5 rounded transition-all"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0B0C10] overflow-y-auto relative">
        <header className="h-16 border-b border-zinc-800/60 flex justify-between items-center px-8 shrink-0 bg-[#0B0C10]/80 backdrop-blur sticky top-0 z-10">
          <h2 className="text-lg font-semibold tracking-tight text-white capitalize">{activeTab} Overview</h2>
          <div className="flex items-center space-x-3 text-xs text-zinc-500 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>API Online: {API_HOST}</span>
          </div>
        </header>

        <div className="p-8 max-w-7xl w-full mx-auto flex-1">
          {/* TAB 1: DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-8">
              {/* Welcome Card */}
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-indigo-900/40 via-purple-950/20 to-zinc-950 border border-indigo-500/20 p-8 shadow-xl">
                <div className="relative z-10 space-y-2 max-w-2xl">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-white via-zinc-100 to-zinc-300 bg-clip-text text-transparent">AI-powered GitHub Issue Triage Dashboard</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    IssuePilot analyzes incoming bugs and feature requests. Our multi-agent Google ADK workflow determines priority, checks for duplicate submissions, detects missing diagnostic data, and recommends tags—keeping repository issues tidy automatically.
                  </p>
                  <div className="pt-4 flex space-x-3">
                    <button onClick={() => setActiveTab("connect")} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-xs font-semibold hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-200">Connect a Repository</button>
                    <button onClick={() => setActiveTab("queue")} className="px-5 py-2.5 rounded-xl bg-zinc-800 text-xs font-semibold hover:bg-zinc-700 transition-all">Open Triage Queue</button>
                  </div>
                </div>
                {/* Decorative glow */}
                <div className="absolute right-0 bottom-0 top-0 w-80 bg-gradient-to-l from-indigo-500/10 to-transparent blur-3xl rounded-full"></div>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-[#12131C] border border-zinc-800/80 rounded-2xl p-6 relative overflow-hidden">
                  <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2">Total Issues Sync</div>
                  <div className="text-3xl font-extrabold text-white">{stats.total}</div>
                  <div className="text-xs text-zinc-400 mt-2 font-mono">{stats.triaged} Triaged &middot; {stats.pending} Pending</div>
                </div>
                <div className="bg-[#12131C] border border-zinc-800/80 rounded-2xl p-6">
                  <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2">Duplicates Caught</div>
                  <div className="text-3xl font-extrabold text-yellow-500">{stats.duplicates}</div>
                  <div className="text-xs text-zinc-400 mt-2">Duplicate rate: {stats.total ? Math.round((stats.duplicates / stats.total) * 100) : 0}%</div>
                </div>
                <div className="bg-[#12131C] border border-zinc-800/80 rounded-2xl p-6">
                  <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2">Missing Information</div>
                  <div className="text-3xl font-extrabold text-sky-400">{stats.missingInfo}</div>
                  <div className="text-xs text-zinc-400 mt-2">Need logs/steps details</div>
                </div>
                <div className="bg-[#12131C] border border-zinc-800/80 rounded-2xl p-6">
                  <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-2">Critical issues</div>
                  <div className="text-3xl font-extrabold text-red-500">{stats.critical}</div>
                  <div className="text-xs text-zinc-400 mt-2">Require immediate action</div>
                </div>
              </div>

              {/* Priority Breakdown Map */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-[#12131C] border border-zinc-800/80 rounded-2xl p-6 lg:col-span-2">
                  <h4 className="font-bold text-sm text-zinc-300 mb-6 flex items-center justify-between">
                    <span>Triage Status Details</span>
                    <span className="text-xs font-normal text-zinc-500">Relational Database & Gemini outputs</span>
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1 text-zinc-400">
                        <span>CRITICAL ({stats.critical})</span>
                        <span>{stats.total ? Math.round((stats.critical / stats.total) * 100) : 0}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-red-500 h-full rounded-full" style={{ width: `${stats.total ? (stats.critical / stats.total) * 100 : 0}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1 text-zinc-400">
                        <span>HIGH ({stats.high})</span>
                        <span>{stats.total ? Math.round((stats.high / stats.total) * 100) : 0}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-orange-500 h-full rounded-full" style={{ width: `${stats.total ? (stats.high / stats.total) * 100 : 0}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1 text-zinc-400">
                        <span>MEDIUM ({stats.medium})</span>
                        <span>{stats.total ? Math.round((stats.medium / stats.total) * 100) : 0}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${stats.total ? (stats.medium / stats.total) * 100 : 0}%` }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1 text-zinc-400">
                        <span>LOW ({stats.low})</span>
                        <span>{stats.total ? Math.round((stats.low / stats.total) * 100) : 0}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                        <div className="bg-green-500 h-full rounded-full" style={{ width: `${stats.total ? (stats.low / stats.total) * 100 : 0}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ADK Observability Status */}
                <div className="bg-[#12131C] border border-zinc-800/80 rounded-2xl p-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h4 className="font-bold text-sm text-zinc-300">ADK Graph Agents</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs border-b border-zinc-800/50 pb-2">
                        <span className="text-zinc-500">Duplicate Check</span>
                        <span className="font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">active</span>
                      </div>
                      <div className="flex items-center justify-between text-xs border-b border-zinc-800/50 pb-2">
                        <span className="text-zinc-500">Missing Info Agent</span>
                        <span className="font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">active</span>
                      </div>
                      <div className="flex items-center justify-between text-xs border-b border-zinc-800/50 pb-2">
                        <span className="text-zinc-500">Triage predictor</span>
                        <span className="font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded">active</span>
                      </div>
                      <div className="flex items-center justify-between text-xs pb-2">
                        <span className="text-zinc-500">Workflow engine</span>
                        <span className="font-mono text-indigo-400">Google ADK 2.0</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-indigo-950/30 border border-indigo-900/40 rounded-xl p-4 mt-4">
                    <div className="flex items-center space-x-2 text-indigo-300 text-xs font-semibold mb-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Observability & Traces</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-normal">
                      Full execution graphs, node timing metrics, and LLM reasoning payloads are traced automatically inside the ADK telemetry system.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CONNECT REPOSITORY */}
          {activeTab === "connect" && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-[#12131C] border border-zinc-800/80 rounded-2xl p-8 shadow-xl space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">Connect GitHub Repository</h3>
                  <p className="text-xs text-zinc-400">
                    Use a Personal Access Token (PAT) with repo scope to connect repositories. Once linked, IssuePilot will import existing issues and configure triage models.
                  </p>
                </div>

                <form onSubmit={handleConnectRepo} className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Owner / Organization</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. google"
                        value={owner}
                        onChange={(e) => setOwner(e.target.value)}
                        className="w-full bg-[#0B0C10] border border-zinc-700/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-zinc-600 transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Repository Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. adk-samples"
                        value={repoName}
                        onChange={(e) => setRepoName(e.target.value)}
                        className="w-full bg-[#0B0C10] border border-zinc-700/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-zinc-600 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wide">GitHub Personal Access Token (PAT)</label>
                    <input
                      type="password"
                      required
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      value={pat}
                      onChange={(e) => setPat(e.target.value)}
                      className="w-full bg-[#0B0C10] border border-zinc-700/60 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 text-white placeholder-zinc-600 font-mono transition-colors"
                    />
                    <div className="text-[10px] text-zinc-500 mt-1">Requires standard read access to issues and search APIs. Token is kept on the server to make fetch requests.</div>
                  </div>

                  {connectError && (
                    <div className="p-4 bg-red-950/20 border border-red-800/40 rounded-xl text-xs text-red-400 flex items-center space-x-2">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>{connectError}</span>
                    </div>
                  )}

                  {connectSuccess && (
                    <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-xl text-xs text-emerald-400 flex items-center space-x-2">
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Repository connected successfully! Importing issues in the background...</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isConnecting}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 font-bold hover:from-indigo-500 hover:to-purple-500 transition-all text-sm disabled:opacity-50 flex justify-center items-center space-x-2 text-white shadow-lg shadow-indigo-600/10"
                  >
                    {isConnecting ? (
                      <>
                        <svg className="animate-spin h-4.5 w-4.5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span>Connecting & Syncing...</span>
                      </>
                    ) : (
                      <span>Connect Repository</span>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: TRIAGE QUEUE */}
          {activeTab === "queue" && (
            <div className="space-y-6">
              {/* Filters Header */}
              <div className="bg-[#12131C] border border-zinc-800/80 rounded-2xl p-4 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-4 items-center">
                  {/* Repo select */}
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-1">Repository</span>
                    <select
                      value={selectedRepoFilter}
                      onChange={(e) => setSelectedRepoFilter(e.target.value)}
                      className="bg-[#0B0C10] border border-zinc-700/60 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-zinc-300"
                    >
                      <option value="">All Connected Repositories</option>
                      {repos.map(r => (
                        <option key={r.id} value={r.id}>{r.owner}/{r.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Priority Select */}
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-1">Priority</span>
                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      className="bg-[#0B0C10] border border-zinc-700/60 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-zinc-300"
                    >
                      <option value="">All Priorities</option>
                      <option value="CRITICAL">Critical</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>

                  {/* Duplicate Select */}
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider mb-1">Duplicate Status</span>
                    <select
                      value={duplicateFilter}
                      onChange={(e) => setDuplicateFilter(e.target.value)}
                      className="bg-[#0B0C10] border border-zinc-700/60 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 text-zinc-300"
                    >
                      <option value="">All Issues</option>
                      <option value="yes">Duplicates Only</option>
                      <option value="no">Non-Duplicates Only</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={fetchIssues}
                  className="px-4 py-2 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-xs font-semibold rounded-xl transition-all flex items-center space-x-1.5 border border-zinc-700/40"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 110 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  <span>Sync Queue</span>
                </button>
              </div>

              {/* Issues Triage Grid / Split Layout */}
              <div className="flex gap-6 items-start">
                {/* List portion */}
                <div className="flex-1 space-y-3 min-w-0">
                  {isLoadingIssues ? (
                    <div className="flex justify-center items-center py-20 text-zinc-500 space-x-3 bg-[#12131C]/30 border border-zinc-800/80 rounded-2xl">
                      <svg className="animate-spin h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-xs">Loading queue...</span>
                    </div>
                  ) : issues.length === 0 ? (
                    <div className="text-center py-20 text-zinc-500 bg-[#12131C]/30 border border-zinc-800/80 rounded-2xl space-y-2">
                      <svg className="w-12 h-12 text-zinc-700 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div className="text-sm font-semibold">Triage queue is empty</div>
                      <p className="text-xs text-zinc-600 max-w-xs mx-auto">No issues linked to criteria, or repository synchronization is still executing in background.</p>
                    </div>
                  ) : (
                    issues.map(issue => (
                      <div
                        key={issue.id}
                        onClick={() => setSelectedIssue(issue)}
                        className={`p-5 rounded-2xl bg-[#12131C] border transition-all duration-200 cursor-pointer hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/[0.02] flex items-start gap-4 ${
                          selectedIssue?.id === issue.id ? "border-indigo-500 bg-indigo-950/10 shadow-md shadow-indigo-600/[0.02]" : "border-zinc-800/80"
                        }`}
                      >
                        {/* Status Icon */}
                        <div className="mt-1">
                          {issue.triaged_at ? (
                            <div className="w-5 h-5 rounded-full bg-indigo-950 text-indigo-400 flex items-center justify-center border border-indigo-800/40">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-zinc-800 text-zinc-500 flex items-center justify-center border border-zinc-700 animate-pulse">
                              <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full"></span>
                            </div>
                          )}
                        </div>

                        {/* Text details */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-bold text-sm text-zinc-100 hover:text-indigo-300 transition-colors truncate">{issue.title}</h4>
                            <span className="text-[10px] font-mono text-zinc-500 shrink-0">#{issue.issue_number}</span>
                          </div>
                          <p className="text-xs text-zinc-400 line-clamp-1">{issue.body || "No description provided."}</p>
                          
                          {/* Badges row */}
                          <div className="flex flex-wrap gap-2 pt-2 items-center">
                            {issue.priority && (
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${getPriorityBadgeClass(issue.priority)}`}>
                                {issue.priority}
                              </span>
                            )}
                            {issue.is_duplicate && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/40 text-amber-400 border border-amber-800/60 uppercase">
                                Duplicate #{issue.duplicate_issue_number}
                              </span>
                            )}
                            {issue.missing_information && issue.missing_information.length > 0 && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-950/40 text-sky-400 border border-sky-800/60 uppercase">
                                Missing Info ({issue.missing_information.length})
                              </span>
                            )}
                            {issue.suggested_labels && issue.suggested_labels.map(l => (
                              <span key={l} className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800/50 text-zinc-400 border border-zinc-700/50">
                                {l}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Triage action button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTriggerTriage(issue.id);
                          }}
                          disabled={triageLoadingId === issue.id}
                          className="shrink-0 p-2 hover:bg-zinc-800 rounded-xl transition-all self-center text-zinc-500 hover:text-zinc-200"
                        >
                          {triageLoadingId === issue.id ? (
                            <svg className="animate-spin h-4.5 w-4.5 text-indigo-400" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 9.172V5L8 4z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Detail Panel */}
                <div className="w-[480px] shrink-0 bg-[#12131C] border border-zinc-800/80 rounded-2xl overflow-hidden sticky top-24 self-start max-h-[calc(100vh-140px)] flex flex-col">
                  {selectedIssue ? (
                    <div className="flex flex-col h-full divide-y divide-zinc-800/60 overflow-y-auto">
                      {/* Header */}
                      <div className="p-6 space-y-4">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-mono font-bold bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">Issue #{selectedIssue.issue_number}</span>
                          <button
                            onClick={() => setSelectedIssue(null)}
                            className="text-zinc-500 hover:text-zinc-300"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                        <h3 className="font-extrabold text-base text-white leading-snug">{selectedIssue.title}</h3>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleTriggerTriage(selectedIssue.id)}
                            disabled={triageLoadingId === selectedIssue.id}
                            className="px-4 py-2 rounded-xl bg-indigo-600 font-bold hover:bg-indigo-500 transition-colors text-xs text-white disabled:opacity-50 flex items-center space-x-1.5"
                          >
                            {triageLoadingId === selectedIssue.id ? (
                              <>
                                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                <span>Running Triage Agent...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89H17.75" />
                                </svg>
                                <span>Run AI Triage Workflow</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Body details */}
                      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                        {/* Priority / Duplicate cards */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-[#0B0C10] border border-zinc-800/80 rounded-xl p-3.5">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">AI Assessed Priority</span>
                            {selectedIssue.priority ? (
                              <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide ${getPriorityBadgeClass(selectedIssue.priority)}`}>
                                {selectedIssue.priority}
                              </span>
                            ) : (
                              <span className="text-xs text-zinc-600 italic">Not evaluated</span>
                            )}
                          </div>
                          <div className="bg-[#0B0C10] border border-zinc-800/80 rounded-xl p-3.5">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Duplicate Catch</span>
                            {selectedIssue.triaged_at ? (
                              selectedIssue.is_duplicate ? (
                                <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-950/40 text-amber-400 border border-amber-800/60 uppercase">
                                  Yes: Issue #{selectedIssue.duplicate_issue_number}
                                </span>
                              ) : (
                                <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-green-950/40 text-green-400 border border-green-800/60 uppercase">
                                  No
                                </span>
                              )
                            ) : (
                              <span className="text-xs text-zinc-600 italic">Not evaluated</span>
                            )}
                          </div>
                        </div>

                        {/* Missing Information list */}
                        {selectedIssue.triaged_at && (
                          <div className="space-y-2">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Missing Diagnostic Details</span>
                            {selectedIssue.missing_information && selectedIssue.missing_information.length > 0 ? (
                              <div className="space-y-1.5">
                                {selectedIssue.missing_information.map((item, idx) => (
                                  <div key={idx} className="flex items-center space-x-2 text-xs bg-sky-950/15 border border-sky-900/30 text-sky-400 px-3 py-2 rounded-xl">
                                    <svg className="w-4 h-4 shrink-0 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <span>{item}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-zinc-400 bg-zinc-900/40 border border-zinc-800/60 px-3 py-2 rounded-xl flex items-center space-x-2">
                                <svg className="w-4 h-4 shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>All diagnostic details present. Excellent report!</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Labels Recommendation */}
                        {selectedIssue.triaged_at && (
                          <div className="space-y-2">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Suggested GitHub Labels</span>
                            {selectedIssue.suggested_labels && selectedIssue.suggested_labels.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {selectedIssue.suggested_labels.map(l => (
                                  <span key={l} className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700/60 shadow-sm">
                                    {l}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-600 italic">No labels suggested</span>
                            )}
                          </div>
                        )}

                        {/* Triage Rationale */}
                        {selectedIssue.triaged_at && selectedIssue.rationale && (
                          <div className="space-y-2">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Agent Reasoning & Citations</span>
                            <div className="p-4 bg-[#0B0C10] border border-zinc-800/80 rounded-xl text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
                              {selectedIssue.rationale}
                            </div>
                          </div>
                        )}

                        {/* Suggested Maintainer Response */}
                        {selectedIssue.triaged_at && selectedIssue.suggested_maintainer_response && (
                          <div className="space-y-2">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Suggested Maintainer Response</span>
                            <div className="p-4 bg-zinc-900 border border-zinc-700/50 rounded-xl text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                              {selectedIssue.suggested_maintainer_response}
                            </div>
                          </div>
                        )}

                        {/* Original Issue Description */}
                        <div className="space-y-2">
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">Original Description</span>
                          <div className="p-4 bg-[#0B0C10] border border-zinc-800/80 rounded-xl text-xs text-zinc-400 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                            {selectedIssue.body || <span className="italic text-zinc-600">No description provided.</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-12 text-center text-zinc-500 flex flex-col items-center justify-center space-y-3 h-64">
                      <svg className="w-10 h-10 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="text-xs font-semibold">Select an issue from the queue</div>
                      <p className="text-[10px] text-zinc-600 leading-normal max-w-[200px]">Click any item to view its detailed AI triage report, suggested labels, and missing info flags.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
