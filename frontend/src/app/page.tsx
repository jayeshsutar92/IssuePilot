import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0C10] text-slate-900 dark:text-zinc-100 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-[#0B0C10]/80 backdrop-blur-md border-b border-slate-200 dark:border-zinc-800/60 transition-colors">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <svg className="w-8 h-8 text-indigo-600 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.905 0-5.54-1.037-7.614-2.766" />
            </svg>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">IssuePilot</span>
          </div>
          <div className="flex items-center space-x-6">
            <Link href="/dashboard" className="text-sm font-semibold text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors">Dashboard</Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-6 flex flex-col items-center justify-center text-center">
        {/* Background Gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[800px] h-[400px] sm:h-[500px] bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-pink-500/20 dark:from-indigo-500/10 dark:via-purple-500/10 dark:to-pink-500/10 blur-[80px] sm:blur-[100px] rounded-full -z-10 animate-pulse"></div>
        
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-8 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
          <span>Powered by Google ADK & Gemini 2.5 Flash</span>
        </div>
        
        <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight max-w-4xl leading-[1.1] mb-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-zinc-100 dark:to-zinc-400 bg-clip-text text-transparent">
          The Autonomous Triage Agent for Open Source
        </h1>
        
        <p className="text-lg lg:text-xl text-slate-600 dark:text-zinc-400 max-w-2xl mb-10 leading-relaxed">
          IssuePilot automatically reviews incoming GitHub issues, identifies duplicates, extracts missing diagnostic context, and assigns priority labels—saving maintainers hours of manual triaging.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          <Link href="/dashboard" className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold hover:shadow-lg hover:shadow-indigo-500/25 hover:-translate-y-0.5 transition-all duration-200">
            View Dashboard
          </Link>
          <Link href="/dashboard" className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-900 dark:text-zinc-100 font-bold hover:bg-slate-50 dark:hover:bg-zinc-800 hover:shadow-lg transition-all duration-200">
            Connect a Repository
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="py-24 px-6 bg-white dark:bg-[#12131C] border-t border-slate-200 dark:border-zinc-800/60 relative z-10 transition-colors">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Intelligent Issue Management</h2>
            <p className="text-slate-500 dark:text-zinc-400 max-w-2xl mx-auto">Built with a parallel-execution multi-agent architecture to analyze issues from multiple angles simultaneously.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-slate-50 dark:bg-[#0B0C10] border border-slate-200 dark:border-zinc-800/80 p-8 rounded-3xl hover:border-amber-300 dark:hover:border-amber-500/50 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300 group">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-3 text-slate-900 dark:text-white">Duplicate Detection</h3>
              <p className="text-slate-600 dark:text-zinc-400 text-sm leading-relaxed">
                Uses semantic similarity and context engineering to flag new issues that overlap with existing repository bugs or feature requests.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="bg-slate-50 dark:bg-[#0B0C10] border border-slate-200 dark:border-zinc-800/80 p-8 rounded-3xl hover:border-sky-300 dark:hover:border-sky-500/50 hover:shadow-xl hover:shadow-sky-500/5 transition-all duration-300 group">
              <div className="w-12 h-12 bg-sky-100 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-3 text-slate-900 dark:text-white">Context Extraction</h3>
              <p className="text-slate-600 dark:text-zinc-400 text-sm leading-relaxed">
                Automatically identifies if crucial information like environment details, reproduction steps, or logs are missing from the submission.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="bg-slate-50 dark:bg-[#0B0C10] border border-slate-200 dark:border-zinc-800/80 p-8 rounded-3xl hover:border-red-300 dark:hover:border-red-500/50 hover:shadow-xl hover:shadow-red-500/5 transition-all duration-300 group">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-3 text-slate-900 dark:text-white">Priority Routing</h3>
              <p className="text-slate-600 dark:text-zinc-400 text-sm leading-relaxed">
                Assigns severity tiers (CRITICAL, HIGH, MEDIUM, LOW) based on impact and recommends maintainer response drafts and labels.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Workflow Visualizer */}
      <section className="py-24 px-6 bg-slate-50 dark:bg-[#0B0C10] relative z-10 overflow-hidden transition-colors">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white">How IssuePilot Works</h2>
            <p className="text-slate-500 dark:text-zinc-400">Google Agent Development Kit (ADK) orchestrates specialized AI agents.</p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">
            {/* Step 1 */}
            <div className="flex-1 w-full bg-white dark:bg-[#12131C] p-6 rounded-2xl border border-slate-200 dark:border-zinc-800/80 text-center shadow-sm">
              <div className="w-10 h-10 mx-auto bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center font-bold text-slate-600 dark:text-zinc-400 mb-4">1</div>
              <h4 className="font-bold text-sm mb-2 text-slate-900 dark:text-zinc-100">Ingest Issue</h4>
              <p className="text-xs text-slate-500 dark:text-zinc-500">GitHub Webhooks push new issues into the PostgreSQL database.</p>
            </div>
            
            <svg className="hidden md:block w-8 h-8 text-slate-300 dark:text-zinc-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            <svg className="md:hidden w-8 h-8 rotate-90 text-slate-300 dark:text-zinc-700 shrink-0 my-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            
            {/* Step 2 */}
            <div className="flex-1 w-full bg-indigo-50 dark:bg-indigo-950/20 p-6 rounded-2xl border border-indigo-200 dark:border-indigo-900/40 text-center shadow-sm shadow-indigo-500/5 relative">
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-indigo-500 rounded-full animate-ping"></div>
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-indigo-500 rounded-full"></div>
              <div className="w-10 h-10 mx-auto bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400 mb-4">2</div>
              <h4 className="font-bold text-sm mb-2 text-indigo-900 dark:text-indigo-100">AI Processing</h4>
              <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80">Parallel ADK agents run evaluations using Gemini 2.5 Flash.</p>
            </div>
            
            <svg className="hidden md:block w-8 h-8 text-slate-300 dark:text-zinc-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            <svg className="md:hidden w-8 h-8 rotate-90 text-slate-300 dark:text-zinc-700 shrink-0 my-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>

            {/* Step 3 */}
            <div className="flex-1 w-full bg-white dark:bg-[#12131C] p-6 rounded-2xl border border-slate-200 dark:border-zinc-800/80 text-center shadow-sm">
              <div className="w-10 h-10 mx-auto bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center font-bold text-slate-600 dark:text-zinc-400 mb-4">3</div>
              <h4 className="font-bold text-sm mb-2 text-slate-900 dark:text-zinc-100">Triage & Sync</h4>
              <p className="text-xs text-slate-500 dark:text-zinc-500">Labels and priorities are synced back to the UI dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center border-t border-slate-200 dark:border-zinc-800/60 bg-white dark:bg-[#12131C] text-slate-500 dark:text-zinc-500 text-sm transition-colors">
        <p>&copy; {new Date().getFullYear()} IssuePilot. A Google ADK + Gemini AI Project.</p>
      </footer>
    </div>
  );
}
