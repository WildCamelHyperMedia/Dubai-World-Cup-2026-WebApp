import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, Image as ImageIcon, Award, Search, Download, 
  ChevronLeft, Filter, Database, Loader2, QrCode, Printer,
  ScanLine, Palette, Clock, X, Eye, ChevronDown, ArrowUpDown, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import dwc30Logo from "@/assets/images/dwc-30th-logo-04-cropped.png";

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds === 0) return "0s";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}

const STATION_NAMES: Record<string, string> = {
  talli: "Talli",
  sadu: "Sadu Weaving",
  saddle: "Saddle Craft",
  pottery: "Pottery",
  silk: "Silk Textiles",
  alkhous: "Al Khous",
};

interface Filters {
  progress: string;
  scans: string;
  customizations: string;
  timeSpent: string;
  arCapture: string;
}

const defaultFilters: Filters = {
  progress: "all",
  scans: "all",
  customizations: "all",
  timeSpent: "all",
  arCapture: "all",
};

function getProgress(user: any): number {
  const custs = (user.customizations as Record<string, string>) || {};
  return Object.keys(custs).length;
}

function getStats(user: any) {
  return user.activityStats || { scanCount: 0, customizeCount: 0, customizeTimeSeconds: null };
}

function applyFilters(participants: any[], filters: Filters): any[] {
  return participants.filter((user) => {
    const progress = getProgress(user);
    const stats = getStats(user);

    if (filters.progress !== "all") {
      if (filters.progress === "0" && progress !== 0) return false;
      if (filters.progress === "1-2" && (progress < 1 || progress > 2)) return false;
      if (filters.progress === "3-4" && (progress < 3 || progress > 4)) return false;
      if (filters.progress === "5-6" && progress < 5) return false;
      if (filters.progress === "complete" && progress < 6) return false;
    }

    if (filters.scans !== "all") {
      if (filters.scans === "0" && stats.scanCount !== 0) return false;
      if (filters.scans === "1-5" && (stats.scanCount < 1 || stats.scanCount > 5)) return false;
      if (filters.scans === "6-10" && (stats.scanCount < 6 || stats.scanCount > 10)) return false;
      if (filters.scans === "10+" && stats.scanCount <= 10) return false;
    }

    if (filters.customizations !== "all") {
      if (filters.customizations === "0" && stats.customizeCount !== 0) return false;
      if (filters.customizations === "1-5" && (stats.customizeCount < 1 || stats.customizeCount > 5)) return false;
      if (filters.customizations === "6-10" && (stats.customizeCount < 6 || stats.customizeCount > 10)) return false;
      if (filters.customizations === "10+" && stats.customizeCount <= 10) return false;
    }

    if (filters.timeSpent !== "all") {
      const t = stats.customizeTimeSeconds;
      if (filters.timeSpent === "none" && t !== null && t > 0) return false;
      if (filters.timeSpent === "<1m" && (t === null || t >= 60)) return false;
      if (filters.timeSpent === "1-5m" && (t === null || t < 60 || t > 300)) return false;
      if (filters.timeSpent === "5m+" && (t === null || t < 300)) return false;
    }

    if (filters.arCapture !== "all") {
      if (filters.arCapture === "captured" && !user.hasCaptured) return false;
      if (filters.arCapture === "pending" && user.hasCaptured) return false;
    }

    return true;
  });
}

function hasActiveFilters(filters: Filters): boolean {
  return Object.values(filters).some(v => v !== "all");
}

function activeFilterCount(filters: Filters): number {
  return Object.values(filters).filter(v => v !== "all").length;
}

function FilterSelect({ label, value, onChange, options, testId }: { 
  label: string; value: string; onChange: (v: string) => void; 
  options: { value: string; label: string }[]; testId: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none bg-[var(--surface-1)] border border-[var(--border)] rounded-lg px-3 py-2 pr-8 text-sm text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] cursor-pointer"
          data-testid={testId}
        >
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [adminPin, setAdminPin] = useState(() => sessionStorage.getItem("adminPin") || "");
  const [pinVerified, setPinVerified] = useState(() => sessionStorage.getItem("adminPinVerified") === "true");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [detailUserId, setDetailUserId] = useState<string | null>(null);

  const handlePinSubmit = async () => {
    try {
      const res = await fetch("/api/admin/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinInput }),
      });
      const data = await res.json();
      if (data.success) {
        setAdminPin(pinInput);
        setPinVerified(true);
        sessionStorage.setItem("adminPin", pinInput);
        sessionStorage.setItem("adminPinVerified", "true");
        setPinError(false);
      } else {
        setPinError(true);
      }
    } catch {
      setPinError(true);
    }
  };

  const { data: stats } = useQuery<{ total: number; completed: number; captured: number }>({
    queryKey: ["/api/admin/stats"],
    refetchInterval: 10000,
  });

  const { data: participants = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/participants", searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ""],
    refetchInterval: 10000,
  });

  const filteredParticipants = useMemo(() => applyFilters(participants, filters), [participants, filters]);

  const completionRate = stats && stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const handleExportFiltered = useCallback(() => {
    const data = filteredParticipants;
    const headers = ["ID", "Name", "Email", "Mobile", "Instagram", "Horse", "Progress", "Captured", "Shared", "Points", "Scans", "Customizations", "Time Spent (seconds)", "Created At"];
    const rows = data.map((p: any) => {
      const custs = (p.customizations as Record<string, string>) || {};
      const s = getStats(p);
      return [
        p.id,
        `"${(p.name || "").replace(/"/g, '""')}"`,
        p.email || "",
        p.mobile || "",
        p.instagram || "",
        p.baseHorse || "",
        `${Object.keys(custs).length}/6`,
        p.hasCaptured ? "Yes" : "No",
        p.hasShared ? "Yes" : "No",
        p.points || 0,
        s.scanCount,
        s.customizeCount,
        s.customizeTimeSeconds ?? "",
        p.createdAt ? new Date(p.createdAt).toISOString() : "",
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dwc30-participants${hasActiveFilters(filters) ? "-filtered" : ""}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredParticipants, filters]);

  const updateFilter = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => setFilters(defaultFilters);

  if (!pinVerified) {
    return (
      <div className="min-h-screen w-full bg-[var(--bg)] flex items-center justify-center text-[var(--text-main)] font-sans p-6">
        <div className="bg-[var(--surface-1)] rounded-2xl border border-[var(--border)] p-8 max-w-sm w-full text-center shadow-lg">
          <img src={dwc30Logo} alt="DWC 30th" className="h-16 mx-auto mb-6 object-contain" />
          <h2 className="font-serif text-2xl mb-2">Admin Access</h2>
          <p className="text-sm text-[var(--text-muted)] mb-6">Enter the admin PIN to continue</p>
          <Input
            type="password"
            value={pinInput}
            onChange={(e) => { setPinInput(e.target.value); setPinError(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") handlePinSubmit(); }}
            placeholder="Admin PIN"
            className="mb-4 text-center text-lg tracking-wider"
            data-testid="input-admin-pin"
          />
          {pinError && (
            <p className="text-red-400 text-sm mb-4">Invalid PIN. Try again.</p>
          )}
          <Button onClick={handlePinSubmit} className="w-full" data-testid="button-submit-pin">
            Access Dashboard
          </Button>
          <button onClick={() => setLocation("/")} className="mt-4 text-sm text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors" data-testid="button-back-home-pin">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[var(--bg)] flex flex-col text-[var(--text-main)] font-sans">
      
      <header className="bg-[var(--surface-1)] border-b border-[var(--border)] p-4 px-6 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-6">
          <button className="text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors p-2 bg-[var(--surface-2)] rounded-full" onClick={() => setLocation("/")} data-testid="button-back-home">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <img src={dwc30Logo} alt="DWC 30th" className="h-10 object-contain" />
          <div className="hidden sm:block pl-6 border-l border-[var(--border)] py-1">
            <h1 className="font-serif text-[22px] text-[var(--text-main)] leading-none mb-1">Command Center</h1>
            <p className="text-[10px] text-[var(--primary)] uppercase tracking-[0.2em] font-bold">AR Journey Data</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-[var(--text-main)]">Admin User</p>
            <p className="text-xs text-[var(--text-muted)]">Event Staff</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center border border-[var(--primary)]/20">
            <span className="text-sm font-bold">AD</span>
          </div>
        </div>
      </header>

      <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[var(--surface-1)] border border-[var(--border)] p-6 rounded-2xl flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <p className="text-[var(--text-muted)] text-sm font-medium uppercase tracking-wider text-[11px]">Registrations</p>
              <div className="p-2 bg-[var(--primary)]/10 rounded-lg">
                <Users className="w-5 h-5 text-[var(--primary)]" />
              </div>
            </div>
            <p className="text-4xl font-serif text-[var(--text-main)]" data-testid="text-total-registrations">{stats?.total ?? "—"}</p>
          </div>
          
          <div className="bg-[var(--surface-1)] border border-[var(--border)] p-6 rounded-2xl flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <p className="text-[var(--text-muted)] text-sm font-medium uppercase tracking-wider text-[11px]">Completed</p>
              <div className="p-2 bg-[var(--primary)]/10 rounded-lg">
                <Award className="w-5 h-5 text-[var(--primary)]" />
              </div>
            </div>
            <p className="text-4xl font-serif text-[var(--text-main)]" data-testid="text-completed">{stats?.completed ?? "—"}</p>
            <p className="text-xs text-[var(--text-muted)]">{completionRate}% completion rate</p>
          </div>

          <div className="bg-[var(--surface-1)] border border-[var(--border)] p-6 rounded-2xl flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <p className="text-[var(--text-muted)] text-sm font-medium uppercase tracking-wider text-[11px]">AR Photos</p>
              <div className="p-2 bg-[var(--primary)]/10 rounded-lg">
                <ImageIcon className="w-5 h-5 text-[var(--primary)]" />
              </div>
            </div>
            <p className="text-4xl font-serif text-[var(--text-main)]" data-testid="text-captured">{stats?.captured ?? "—"}</p>
            <p className="text-xs text-[var(--text-muted)]">Valid for competition</p>
          </div>

          <div className="bg-[var(--primary)]/5 border border-[var(--primary)]/20 p-6 rounded-2xl flex flex-col shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[var(--primary)] text-sm font-bold uppercase tracking-wider text-[11px]">Export Data</p>
              <Database className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <p className="text-sm text-[var(--text-muted)] mt-1 mb-4 leading-relaxed">
              {hasActiveFilters(filters)
                ? `Export ${filteredParticipants.length} filtered participants.`
                : "Download participant data for the prize draw."}
            </p>
            <Button 
              className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white h-11 text-xs mt-auto font-bold rounded-xl tracking-wider uppercase shadow-sm"
              onClick={handleExportFiltered}
              data-testid="button-export-csv"
            >
              <Download className="w-4 h-4 mr-2" />
              {hasActiveFilters(filters) ? "Export Filtered CSV" : "Export CSV"}
            </Button>
          </div>
        </div>

        <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl flex flex-col flex-1 overflow-hidden shadow-sm">
          
          <div className="p-6 border-b border-[var(--border)] flex flex-col gap-4 bg-[var(--surface-2)]/30">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <h2 className="font-serif text-[22px] text-[var(--text-main)]">Participant Directory</h2>
                {hasActiveFilters(filters) && (
                  <Badge className="bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 px-2 py-0.5 text-xs font-bold" data-testid="badge-filter-count">
                    {filteredParticipants.length} / {participants.length}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <Input 
                    placeholder="Search name, email, or IG..." 
                    className="pl-10 bg-[var(--surface-1)] border-[var(--border)] text-[var(--text-main)] h-11 rounded-xl focus-visible:ring-[var(--primary)] focus-visible:border-[var(--primary)] shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-testid="input-search"
                  />
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className={`h-11 w-11 border-[var(--border)] bg-[var(--surface-1)] rounded-xl shrink-0 shadow-sm relative ${
                    showFilters || hasActiveFilters(filters)
                      ? "text-[var(--primary)] border-[var(--primary)]/30 bg-[var(--primary)]/5"
                      : "text-[var(--text-muted)] hover:text-[var(--primary)] hover:border-[var(--primary)]/30"
                  }`}
                  onClick={() => setShowFilters(!showFilters)}
                  data-testid="button-toggle-filters"
                >
                  <Filter className="w-4 h-4" />
                  {activeFilterCount(filters) > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--primary)] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {activeFilterCount(filters)}
                    </span>
                  )}
                </Button>
              </div>
            </div>

            {showFilters && (
              <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5 mt-1" data-testid="filter-panel">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="w-4 h-4 text-[var(--primary)]" />
                    <span className="text-sm font-bold text-[var(--text-main)]">Filter Participants</span>
                  </div>
                  {hasActiveFilters(filters) && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-[var(--primary)] hover:underline font-medium flex items-center gap-1"
                      data-testid="button-clear-filters"
                    >
                      <X className="w-3 h-3" />
                      Clear All
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  <FilterSelect
                    label="Progress"
                    value={filters.progress}
                    onChange={(v) => updateFilter("progress", v)}
                    testId="filter-progress"
                    options={[
                      { value: "all", label: "All" },
                      { value: "0", label: "0 Crafts" },
                      { value: "1-2", label: "1–2 Crafts" },
                      { value: "3-4", label: "3–4 Crafts" },
                      { value: "5-6", label: "5–6 Crafts" },
                      { value: "complete", label: "Complete (6/6)" },
                    ]}
                  />
                  <FilterSelect
                    label="Scans"
                    value={filters.scans}
                    onChange={(v) => updateFilter("scans", v)}
                    testId="filter-scans"
                    options={[
                      { value: "all", label: "All" },
                      { value: "0", label: "0 Scans" },
                      { value: "1-5", label: "1–5 Scans" },
                      { value: "6-10", label: "6–10 Scans" },
                      { value: "10+", label: "10+ Scans" },
                    ]}
                  />
                  <FilterSelect
                    label="Customizations"
                    value={filters.customizations}
                    onChange={(v) => updateFilter("customizations", v)}
                    testId="filter-customizations"
                    options={[
                      { value: "all", label: "All" },
                      { value: "0", label: "0" },
                      { value: "1-5", label: "1–5" },
                      { value: "6-10", label: "6–10" },
                      { value: "10+", label: "10+" },
                    ]}
                  />
                  <FilterSelect
                    label="Time Spent"
                    value={filters.timeSpent}
                    onChange={(v) => updateFilter("timeSpent", v)}
                    testId="filter-time-spent"
                    options={[
                      { value: "all", label: "All" },
                      { value: "none", label: "No activity" },
                      { value: "<1m", label: "< 1 minute" },
                      { value: "1-5m", label: "1–5 minutes" },
                      { value: "5m+", label: "5+ minutes" },
                    ]}
                  />
                  <FilterSelect
                    label="AR Capture"
                    value={filters.arCapture}
                    onChange={(v) => updateFilter("arCapture", v)}
                    testId="filter-ar-capture"
                    options={[
                      { value: "all", label: "All" },
                      { value: "captured", label: "Captured" },
                      { value: "pending", label: "Pending" },
                    ]}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
              </div>
            ) : (
              <Table>
                <TableHeader className="bg-[var(--surface-2)]">
                  <TableRow className="border-[var(--border)] hover:bg-transparent">
                    <TableHead className="text-[var(--text-muted)] font-semibold w-[100px] uppercase tracking-wider text-[10px] py-4">User ID</TableHead>
                    <TableHead className="text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[10px] py-4">Participant</TableHead>
                    <TableHead className="text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[10px] py-4">Contact</TableHead>
                    <TableHead className="text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[10px] py-4">Instagram</TableHead>
                    <TableHead className="text-[var(--text-muted)] font-semibold text-center uppercase tracking-wider text-[10px] py-4">Progress</TableHead>
                    <TableHead className="text-[var(--text-muted)] font-semibold text-center uppercase tracking-wider text-[10px] py-4">Scans</TableHead>
                    <TableHead className="text-[var(--text-muted)] font-semibold text-center uppercase tracking-wider text-[10px] py-4">Customizations</TableHead>
                    <TableHead className="text-[var(--text-muted)] font-semibold text-center uppercase tracking-wider text-[10px] py-4">Time Spent</TableHead>
                    <TableHead className="text-[var(--text-muted)] font-semibold text-center uppercase tracking-wider text-[10px] py-4">AR Capture</TableHead>
                    <TableHead className="text-[var(--text-muted)] font-semibold text-right py-4"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParticipants.map((user: any) => {
                    const progress = getProgress(user);
                    const dateStr = user.createdAt ? new Date(user.createdAt).toLocaleString() : "";
                    const userStats = getStats(user);
                    return (
                      <TableRow key={user.id} className="border-[var(--border)] hover:bg-[var(--surface-2)]/50 transition-colors cursor-pointer" data-testid={`row-participant-${user.id}`} onClick={() => setDetailUserId(user.id)}>
                        <TableCell className="font-mono text-xs text-[var(--text-muted)] py-4">{user.id.slice(0, 8)}</TableCell>
                        <TableCell className="py-4">
                          <p className="font-semibold text-[var(--text-main)]">{user.name}</p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">{dateStr}</p>
                        </TableCell>
                        <TableCell className="py-4">
                          <p className="text-sm text-[var(--text-main)] font-medium">{user.email}</p>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">{user.mobile}</p>
                        </TableCell>
                        <TableCell className="py-4">
                          {user.instagram ? (
                            <a href={`https://instagram.com/${user.instagram.replace('@', '')}`} target="_blank" className="text-[var(--primary)] hover:underline text-sm flex items-center gap-1 font-semibold" onClick={(e) => e.stopPropagation()}>
                              {user.instagram}
                            </a>
                          ) : (
                            <span className="text-[var(--text-muted)] text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center py-4">
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            <span className="text-xs font-bold text-[var(--text-main)]">{progress}/6 Crafts</span>
                            <div className="flex gap-1">
                              {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className={`w-2 h-2 rounded-full ${i < progress ? 'bg-[var(--primary)]' : 'bg-[var(--surface-2)] border border-[var(--border)]'}`} />
                              ))}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center py-4" data-testid={`text-scans-${user.id}`}>
                          <div className="flex items-center justify-center gap-1.5">
                            <ScanLine className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            <span className="text-sm font-semibold text-[var(--text-main)]">{userStats.scanCount}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center py-4" data-testid={`text-customizations-${user.id}`}>
                          <div className="flex items-center justify-center gap-1.5">
                            <Palette className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            <span className="text-sm font-semibold text-[var(--text-main)]">{userStats.customizeCount}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center py-4" data-testid={`text-time-spent-${user.id}`}>
                          <div className="flex items-center justify-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                            <span className="text-sm font-medium text-[var(--text-main)]">{formatDuration(userStats.customizeTimeSeconds)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center py-4">
                          {user.hasCaptured ? (
                            <Badge className="bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20 hover:bg-[var(--primary)]/20 px-3 py-1 rounded-full font-semibold shadow-sm">Captured</Badge>
                          ) : (
                            <Badge variant="outline" className="text-[var(--text-muted)] border-[var(--border)] bg-[var(--surface-1)] px-3 py-1 rounded-full font-medium">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right py-4">
                          <button
                            className="text-[var(--text-muted)] hover:text-[var(--primary)] p-2 transition-colors rounded-lg hover:bg-[var(--surface-2)]"
                            onClick={(e) => { e.stopPropagation(); setDetailUserId(user.id); }}
                            data-testid={`button-view-detail-${user.id}`}
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            
            {!isLoading && filteredParticipants.length === 0 && (
              <div className="p-12 text-center text-[var(--text-muted)] flex flex-col items-center">
                <Search className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-lg font-serif">No participants found</p>
                <p className="text-sm font-light mt-1">
                  {hasActiveFilters(filters) ? "Try adjusting your filters." : "Try adjusting your search terms."}
                </p>
                {hasActiveFilters(filters) && (
                  <button onClick={clearFilters} className="mt-3 text-sm text-[var(--primary)] hover:underline font-medium" data-testid="button-clear-filters-empty">
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </div>

        </div>

        <QRCodesSection adminPin={adminPin} />

      </div>

      {detailUserId && (
        <ParticipantDetailModal
          participantId={detailUserId}
          onClose={() => setDetailUserId(null)}
        />
      )}
    </div>
  );
}

function ParticipantDetailModal({ participantId, onClose }: { participantId: string; onClose: () => void }) {
  const { data, isLoading } = useQuery<{ participant: any; events: any[] }>({
    queryKey: [`/api/admin/participants/${participantId}/activity`],
  });

  const handleExportActivity = () => {
    if (!data) return;
    const { participant, events } = data;
    const headers = ["Timestamp", "Event Type", "Station", "Details"];
    const rows = events.map((e: any) => [
      e.createdAt ? new Date(e.createdAt).toLocaleString() : "",
      e.eventType,
      e.stationId ? (STATION_NAMES[e.stationId] || e.stationId) : "",
      e.metadata ? JSON.stringify(e.metadata) : "",
    ].join(","));
    const csv = [
      `Participant: ${participant.name || "Guest"} (${participant.id})`,
      "",
      headers.join(","),
      ...rows,
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-${participant.name || "guest"}-${participantId.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose} data-testid="modal-participant-detail">
      <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
          </div>
        ) : data ? (
          <>
            <div className="p-6 border-b border-[var(--border)] flex items-start justify-between">
              <div>
                <h3 className="font-serif text-xl text-[var(--text-main)]" data-testid="detail-participant-name">{data.participant.name || "Guest"}</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">{data.participant.id}</p>
                <div className="flex items-center gap-4 mt-3 text-sm text-[var(--text-muted)]">
                  {data.participant.email && <span>{data.participant.email}</span>}
                  {data.participant.mobile && <span>{data.participant.mobile}</span>}
                  {data.participant.instagram && (
                    <a href={`https://instagram.com/${data.participant.instagram.replace('@', '')}`} target="_blank" className="text-[var(--primary)] hover:underline font-semibold">
                      {data.participant.instagram}
                    </a>
                  )}
                </div>
              </div>
              <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-2 rounded-lg hover:bg-[var(--surface-2)] transition-colors" data-testid="button-close-detail">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-3 p-6 border-b border-[var(--border)]">
              {(() => {
                const custs = (data.participant.customizations as Record<string, string>) || {};
                const progress = Object.keys(custs).length;
                const scanCount = data.events.filter((e: any) => e.eventType === "scan").length;
                const customizeEvents = data.events.filter((e: any) => e.eventType === "customize");
                const customizeCount = customizeEvents.length;
                let customizeTimeSeconds: number | null = null;
                if (customizeEvents.length >= 2) {
                  const times = customizeEvents.map((e: any) => new Date(e.createdAt).getTime()).sort((a: number, b: number) => a - b);
                  customizeTimeSeconds = Math.round((times[times.length - 1] - times[0]) / 1000);
                }
                return (
                  <>
                    <div className="bg-[var(--surface-2)] rounded-xl p-3 text-center">
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold mb-1">Progress</p>
                      <p className="text-lg font-serif text-[var(--text-main)]" data-testid="detail-progress">{progress}/6</p>
                    </div>
                    <div className="bg-[var(--surface-2)] rounded-xl p-3 text-center">
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold mb-1">Scans</p>
                      <p className="text-lg font-serif text-[var(--text-main)]" data-testid="detail-scans">{scanCount}</p>
                    </div>
                    <div className="bg-[var(--surface-2)] rounded-xl p-3 text-center">
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold mb-1">Customizations</p>
                      <p className="text-lg font-serif text-[var(--text-main)]" data-testid="detail-customizations">{customizeCount}</p>
                    </div>
                    <div className="bg-[var(--surface-2)] rounded-xl p-3 text-center">
                      <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold mb-1">Time Spent</p>
                      <p className="text-lg font-serif text-[var(--text-main)]" data-testid="detail-time-spent">{formatDuration(customizeTimeSeconds)}</p>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="flex items-center justify-between px-6 pt-4 pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[var(--primary)]" />
                <h4 className="text-sm font-bold text-[var(--text-main)]">Activity Timeline</h4>
                <Badge className="bg-[var(--surface-2)] text-[var(--text-muted)] border-0 text-[10px] px-2 py-0.5" data-testid="detail-event-count">
                  {data.events.length} events
                </Badge>
              </div>
              <button
                onClick={handleExportActivity}
                className="flex items-center gap-1.5 text-xs text-[var(--primary)] hover:underline font-medium"
                data-testid="button-export-activity"
              >
                <Download className="w-3.5 h-3.5" />
                Export Activity
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {data.events.length === 0 ? (
                <div className="py-8 text-center text-[var(--text-muted)]">
                  <Activity className="w-10 h-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">No activity recorded yet.</p>
                </div>
              ) : (
                <div className="relative mt-2">
                  <div className="absolute left-[17px] top-2 bottom-2 w-px bg-[var(--border)]" />
                  <div className="flex flex-col gap-0.5">
                    {data.events.map((event: any, i: number) => (
                      <div key={event.id || i} className="flex items-start gap-3 relative py-2" data-testid={`activity-event-${i}`}>
                        <div className={`w-[9px] h-[9px] rounded-full mt-1.5 shrink-0 relative z-10 ring-2 ring-[var(--surface-1)] ${
                          event.eventType === "scan" ? "bg-[#2E4A8B]" : "bg-[#B89B71]"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge className={`text-[10px] px-2 py-0 font-bold border-0 ${
                              event.eventType === "scan"
                                ? "bg-[#2E4A8B]/10 text-[#2E4A8B]"
                                : "bg-[#B89B71]/10 text-[#8B6914]"
                            }`}>
                              {event.eventType === "scan" ? "SCAN" : "CUSTOMIZE"}
                            </Badge>
                            {event.stationId && (
                              <span className="text-xs text-[var(--text-main)] font-medium">
                                {STATION_NAMES[event.stationId] || event.stationId}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-[var(--text-muted)]">
                              {event.createdAt ? new Date(event.createdAt).toLocaleString() : ""}
                            </span>
                            {event.metadata && Object.keys(event.metadata).length > 0 && (
                              <span className="text-[10px] text-[var(--text-muted)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded">
                                {Object.entries(event.metadata).map(([k, v]) => `${k}: ${v}`).join(", ")}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

import { useTranslation } from "react-i18next";

interface StationQR {
  stationId: string;
  code: string;
  qrDataUrl: string;
  stationName: string;
}

const STATION_I18N_KEYS: Record<string, string> = {
  talli: "station_talli",
  sadu: "station_weaving",
  saddle: "station_leather",
  alkhous: "station_alkhous",
  pottery: "station_pottery",
  silk: "station_fabric",
};

function QRCodesSection({ adminPin }: { adminPin: string }) {
  const { t } = useTranslation();
  const [stationQRs, setStationQRs] = useState<StationQR[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/station-qr-all", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: adminPin }),
        });
        if (!res.ok) throw new Error("Failed to fetch QR codes");
        const data: StationQR[] = await res.json();
        if (!cancelled) {
          setStationQRs(data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(t("admin_qr_load_error"));
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [t, adminPin]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadAll = () => {
    stationQRs.forEach((station) => {
      const link = document.createElement("a");
      link.href = station.qrDataUrl;
      link.download = `station-${station.stationId}-${station.code}.png`;
      link.click();
    });
  };

  const stationDescriptions: Record<string, { title: string; subtitle: string }> = {
    talli: { title: "Talli", subtitle: "Gold Thread Embroidery" },
    sadu: { title: "Sadu", subtitle: "Bedouin Weaving" },
    saddle: { title: "Saddles", subtitle: "Leather Craftsmanship" },
    pottery: { title: "Pottery", subtitle: "Clay Sculpting" },
    silk: { title: "Silks", subtitle: "Luxury Textiles" },
    alkhous: { title: "Al Khous", subtitle: "Palm Leaf Weaving" },
  };

  return (
    <>
      <div className="rounded-2xl overflow-hidden mt-8 print:hidden" data-testid="admin-qr-section">
        <div className="relative" style={{ background: "linear-gradient(135deg, #5C3D2E 0%, #3D2A1F 40%, #2E4A8B 100%)" }}>
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
          <div className="relative px-8 py-8 flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/10">
                <QrCode className="w-7 h-7 text-[#B89B71]" />
              </div>
              <div>
                <h3 className="font-serif text-2xl text-white leading-tight mb-1">{t("admin_qr_codes")}</h3>
                <p className="text-sm text-white/50">{t("admin_qr_codes_desc")}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleDownloadAll}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 text-white/80 hover:bg-white/20 hover:text-white transition-all text-sm font-medium"
                data-testid="button-download-qr"
              >
                <Download className="w-4 h-4" />
                Download All
              </button>
              <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-[#5C3D2E] transition-all shadow-lg"
                style={{ background: "linear-gradient(135deg, #B89B71, #D4B896)" }}
                data-testid="button-print-qr"
              >
                <Printer className="w-4 h-4" />
                {t("admin_qr_print")}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-[var(--surface-1)] border border-[var(--border)] border-t-0 rounded-b-2xl">
          <div className="p-8">
            {loading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-[#B89B71]" />
              </div>
            )}
            {error && (
              <div className="text-center py-8 text-red-400 text-sm">{error}</div>
            )}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
              {stationQRs.map((station) => {
                const desc = stationDescriptions[station.stationId];
                return (
                  <div 
                    key={station.stationId} 
                    className="group relative rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-[#B89B71]/15 hover:-translate-y-1"
                    style={{ border: "1px solid rgba(184, 155, 113, 0.2)" }}
                    data-testid={`qr-card-${station.stationId}`}
                  >
                    <div className="px-5 py-4 flex items-center justify-center" style={{ background: "#B89B71" }}>
                      <img src={dwc30Logo} alt="DWC 30th" className="h-8 object-contain brightness-0 invert" />
                    </div>

                    <div className="bg-white px-5 pt-5 pb-4 flex flex-col items-center" style={{ background: "#FAF8F5" }}>
                      <p className="text-[11px] font-bold text-[#5C3D2E] uppercase tracking-[0.25em] mb-4">Heritage Trail Station</p>

                      <div className="p-1 rounded-xl mb-4 bg-white" style={{ boxShadow: "0 2px 12px rgba(92, 61, 46, 0.08)" }}>
                        <img 
                          src={station.qrDataUrl} 
                          alt={`QR code for ${desc?.title}`}
                          className="w-[170px] h-[170px]"
                        />
                      </div>

                      <p className="text-xl font-serif text-[#1a1a1a] text-center mb-1">
                        {desc?.title} <span className="text-[#B89B71]">&mdash;</span> {desc?.subtitle}
                      </p>

                      <div className="mt-3 rounded-lg px-5 py-2 mb-3" style={{ background: "rgba(184, 155, 113, 0.12)" }}>
                        <p className="text-lg font-mono font-black tracking-[0.4em] text-[#5C3D2E] text-center">{station.code}</p>
                      </div>

                      <p className="text-[10px] text-[#999] text-center">Scan QR or enter code in the app to unlock this station</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="hidden print:block">
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            .print-qr-sheet, .print-qr-sheet * { visibility: visible !important; }
            .print-qr-sheet { 
              position: fixed !important; 
              left: 0 !important; 
              top: 0 !important; 
              width: 100% !important;
              background: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print-station-page { page-break-after: always; }
            .print-station-page:last-child { page-break-after: auto; }
            @page { margin: 0; size: A4 portrait; }
          }
        `}</style>
        <div className="print-qr-sheet">
          {stationQRs.map((station) => {
            const desc = stationDescriptions[station.stationId];
            return (
              <div key={station.stationId} className="print-station-page w-full flex flex-col" style={{ minHeight: "100vh" }}>
                <div className="w-full px-10 py-8 flex items-center justify-center" style={{ background: "#B89B71" }}>
                  <img src={dwc30Logo} alt="DWC 30th Anniversary" className="h-20 object-contain brightness-0 invert" />
                </div>

                <div className="flex-1 flex flex-col items-center justify-center px-16" style={{ background: "#FAF8F5" }}>
                  <p className="text-2xl font-bold text-[#1a1a1a] uppercase tracking-[0.35em] mb-12">Heritage Trail Station</p>

                  <div className="p-3 rounded-2xl bg-white mb-10" style={{ boxShadow: "0 4px 24px rgba(92, 61, 46, 0.1)" }}>
                    <img 
                      src={station.qrDataUrl} 
                      alt={`QR code for ${desc?.title}`}
                      className="w-[320px] h-[320px]"
                    />
                  </div>

                  <p className="text-4xl font-serif text-[#1a1a1a] text-center mb-2">
                    {desc?.title} <span className="text-[#B89B71]">&mdash;</span> {desc?.subtitle}
                  </p>

                  <div className="mt-6 rounded-xl px-10 py-3" style={{ background: "rgba(184, 155, 113, 0.12)" }}>
                    <p className="text-3xl font-mono font-black tracking-[0.5em] text-[#5C3D2E] text-center">{station.code}</p>
                  </div>

                  <p className="text-sm text-[#999] text-center mt-8">Scan QR or enter code in the app to unlock this station</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
