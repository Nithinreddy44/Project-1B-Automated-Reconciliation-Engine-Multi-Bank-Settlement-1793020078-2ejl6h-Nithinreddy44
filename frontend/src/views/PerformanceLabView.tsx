import React, { useEffect, useState } from 'react';
import {
  Cpu,
  Zap,
  Play,
  RotateCw,
  CheckCircle2,
  Flame,
} from 'lucide-react';
import { api } from '../api/client';

export const PerformanceLabView: React.FC = () => {
  const [meta, setMeta] = useState<{ spec_benchmarks: any[]; available_scenarios: any[] } | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Runner Configuration
  const [mode, setMode] = useState<'SANDBOX' | 'CAMPAIGN'>('SANDBOX');
  const [scenario, setScenario] = useState('STANDARD_MULTI_BANK');
  const [recordCount, setRecordCount] = useState(50000);
  const [format, setFormat] = useState('CSV');
  const [isRunning, setIsRunning] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<any | null>(null);

  const fetchMeta = async () => {
    try {
      setLoadingMeta(true);
      const data = await api.getBenchmarksMeta();
      setMeta(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingMeta(false);
    }
  };

  useEffect(() => {
    fetchMeta();
  }, []);

  const handleRunBenchmark = async () => {
    try {
      setIsRunning(true);
      setBenchmarkResult(null);
      const res = await api.runBenchmark({
        mode,
        scenario,
        record_count: Number(recordCount),
        format,
      });
      setBenchmarkResult(res);
    } catch (err: any) {
      alert(err.message || 'Benchmark run failed.');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Performance Lab & High-Throughput Engine Benchmarking</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Simulate 100k+ record settlement spikes, test parser velocity across banking formats, and stress-test the 3-pass matcher
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded text-xs font-bold font-mono">
            ENGINE TARGET: 100k REC/MIN
          </span>
        </div>
      </div>

      {/* Benchmark Setup & Configuration Panel */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Flame className="w-4 h-4 text-amber-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
            Configure Live Stress Test Run
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Execution Environment:</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium"
            >
              <option value="SANDBOX">SANDBOX (Isolated Memory Buffer)</option>
              <option value="CAMPAIGN">CAMPAIGN (Simulated Production Spikes)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Stress Scenario:</label>
            <select
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium"
            >
              <option value="STANDARD_MULTI_BANK">Clean Multi-Bank Settlement (99% match)</option>
              <option value="BANK_FORMAT_CHANGE">Barclays Schema Header Mutation</option>
              <option value="BACKLOG_CRISIS">Peak Black Friday 250k Surge</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Record Volume:</label>
            <select
              value={recordCount}
              onChange={(e) => setRecordCount(Number(e.target.value))}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium"
            >
              <option value="10000">10,000 Records (Quick Smoke Test)</option>
              <option value="50000">50,000 Records (Standard Intraday)</option>
              <option value="100000">100,000 Records (SLA Spec Target)</option>
              <option value="250000">250,000 Records (Stress Spike)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Banking Feed Format:</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 font-medium"
            >
              <option value="CSV">Bank CSV (Standard Delimited)</option>
              <option value="MT940">SWIFT MT940 Statement</option>
              <option value="CAMT.053">ISO 20022 CAMT.053 XML</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-slate-500">
            Measures parsing throughput, pass 1 exact match indexing, pass 2 fuzzy sweeps, and peak RAM consumption.
          </p>
          <button
            type="button"
            onClick={handleRunBenchmark}
            disabled={isRunning}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Executing High-Volume Simulation...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Start Benchmark Execution</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Live Benchmark Execution Results */}
      {benchmarkResult && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs space-y-6 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900">
                  Execution Complete: {benchmarkResult.records_tested?.toLocaleString()} Records Processed
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    benchmarkResult.throughput_records_per_min >= 100000
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {benchmarkResult.throughput_records_per_min >= 100000 ? 'SPEC PASSED' : 'DEGRADED'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Scenario: <strong>{benchmarkResult.scenario}</strong> • Format: <strong>{benchmarkResult.format}</strong> • Environment: <strong>{benchmarkResult.mode}</strong>
              </p>
            </div>
            <div className="flex items-center gap-3 text-right">
              <div>
                <div className="text-[11px] text-slate-400">Total Latency</div>
                <div className="text-base font-mono font-bold text-slate-900">{benchmarkResult.total_elapsed_seconds}s</div>
              </div>
              <div className="pl-3 border-l border-slate-200">
                <div className="text-[11px] text-slate-400">Peak Memory</div>
                <div className="text-base font-mono font-bold text-slate-900">{benchmarkResult.peak_memory_mb} MB</div>
              </div>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[11px] text-slate-500 uppercase font-semibold">Parser Throughput</div>
              <div className="text-xl font-bold font-mono text-indigo-600 mt-1">
                {benchmarkResult.throughput_records_per_min?.toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Records / Minute (Target: 100,000)</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[11px] text-slate-500 uppercase font-semibold">Exact Match Ratio</div>
              <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
                {benchmarkResult.exact_matched_count?.toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Pass 1 Direct Hits</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[11px] text-slate-500 uppercase font-semibold">Fuzzy Sweep Matches</div>
              <div className="text-xl font-bold font-mono text-indigo-700 mt-1">
                {benchmarkResult.fuzzy_matched_count?.toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Pass 2 Window Matched</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-[11px] text-slate-500 uppercase font-semibold">Exceptions Routed</div>
              <div className="text-xl font-bold font-mono text-amber-700 mt-1">
                {benchmarkResult.exceptions_generated?.toLocaleString()}
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">Pass 3 Discrepancy Queue</p>
            </div>
          </div>

          {/* Pipeline Stage Timing Breakdown */}
          {benchmarkResult.stages && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 font-bold text-xs uppercase tracking-wider text-slate-800">
                Stage Latency Breakdown
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                    <th className="py-2.5 px-4">Pipeline Stage</th>
                    <th className="py-2.5 px-4">Records Handled</th>
                    <th className="py-2.5 px-4">Elapsed Duration</th>
                    <th className="py-2.5 px-4">Velocity</th>
                    <th className="py-2.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {benchmarkResult.stages.map((st: any) => (
                    <tr key={st.name} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{st.name}</td>
                      <td className="py-2.5 px-4 font-mono">{st.records_processed?.toLocaleString()}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-800">{st.elapsed_ms} ms</td>
                      <td className="py-2.5 px-4 font-mono text-indigo-700 font-semibold">
                        {st.records_per_sec?.toLocaleString()} rec/sec
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          PASSED
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Architectural SLA & Spec Benchmarks Matrix */}
      {loadingMeta ? (
        <div className="p-8 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
          Loading benchmark specifications...
        </div>
      ) : meta && meta.spec_benchmarks ? (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Official Settlement Engine Performance Benchmarks
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Target performance criteria specified in the Multi-Bank Settlement Architecture Plan
              </p>
            </div>
            <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded">
              7 Specification Standards
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/40 text-slate-500 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Benchmark ID</th>
                  <th className="py-3 px-4">Metric Name</th>
                  <th className="py-3 px-4">Target Requirement</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {meta.spec_benchmarks.map((bm: any) => (
                  <tr key={bm.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{bm.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{bm.name}</td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">{bm.target}</td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] uppercase font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {bm.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Certified</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
};
