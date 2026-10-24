import React, { useState, useEffect } from 'react';
import { BarChart3, Database, Table, Play, Download } from 'lucide-react';
import { analyticsApi } from '../services/api';

const ANALYTICS_LIST = [
  { id: 'stock-running-total', name: 'Stock Running Total', desc: 'Window Function: SUM() OVER (PARTITION BY blood_group ORDER BY day)' },
  { id: 'demand-rolling-avg', name: '7-Day Rolling Demand', desc: 'Window Function: 7-day AVG() OVER (ROWS BETWEEN 6 PRECEDING AND CURRENT)' },
  { id: 'donor-ranking', name: 'Donor Ranking by Region', desc: 'Window Function: DENSE_RANK() OVER (PARTITION BY region_code)' },
  { id: 'donation-gaps', name: 'Donation Intervals', desc: 'Window Function: LAG() for days between consecutive donations' },
  { id: 'fefo-candidates', name: 'FEFO Candidate Priority', desc: 'Window Function: ROW_NUMBER() OVER (PARTITION BY group, comp ORDER BY expires_on)' },
  { id: 'branch-hierarchy-stock', name: 'Hub-and-Spoke Hierarchy', desc: 'Recursive CTE: Rolling inventory up from local branches to regional hubs' },
  { id: 'expiry-risk', name: 'Expiry Risk Forecast', desc: 'Aggregates with HAVING: Units expiring within next 7 days' },
  { id: 'shortage-report', name: 'Critical Shortage Report', desc: 'Multi-table JOINs: Branches with stock below safety threshold' },
  { id: 'lab-positivity-rate', name: 'Infectious Positivity Rate', desc: 'JSONB Aggregation: Test positivity percentages across pathogens' }
];

export default function AnalyticsPage() {
  const [selectedQuery, setSelectedQuery] = useState(ANALYTICS_LIST[0]);
  const [queryData, setQueryData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const executeQuery = async (query = selectedQuery) => {
    try {
      setLoading(true);
      setError(null);
      const res = await analyticsApi.getQuery(query.id);
      setQueryData(res.data || []);
    } catch (err) {
      setError(err.message || 'Analytics query execution failed');
      setQueryData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeQuery(selectedQuery);
  }, [selectedQuery]);

  const columns = queryData.length > 0 ? Object.keys(queryData[0]) : [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)' }}>
            Advanced Database SQL Analytics
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Executes raw PostgreSQL Window Functions, Recursive CTEs, and Multi-Table Aggregates
          </p>
        </div>

        <button
          onClick={() => executeQuery(selectedQuery)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--primary)',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            fontWeight: '700',
            fontSize: '13px'
          }}
        >
          <Play size={15} fill="#ffffff" />
          Rerun Query
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '24px' }}>
        {/* Queries Menu */}
        <div className="hope-card" style={{ padding: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', paddingLeft: '8px' }}>
            Specification Queries (9)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {ANALYTICS_LIST.map((q) => {
              const isSelected = selectedQuery.id === q.id;
              return (
                <div
                  key={q.id}
                  onClick={() => setSelectedQuery(q)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'var(--primary-light)' : 'transparent',
                    color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                    fontWeight: isSelected ? '700' : '500',
                    fontSize: '13px',
                    borderLeft: isSelected ? '3px solid var(--primary)' : '3px solid transparent',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div>{q.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '400', marginTop: '2px' }}>
                    {q.id}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Results Pane */}
        <div className="hope-card" style={{ padding: '24px' }}>
          <div style={{ marginBottom: '20px', borderBottom: '1px solid var(--border-light)', paddingBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Database size={18} color="var(--primary)" />
              <h3 style={{ fontSize: '17px', fontWeight: '800' }}>{selectedQuery.name}</h3>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {selectedQuery.desc}
            </div>
          </div>

          {error && (
            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#fbebee', color: 'var(--danger)', fontSize: '13px', fontWeight: '600', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Executing SQL analytical pipeline...
            </div>
          ) : queryData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              No rows returned by this query
            </div>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: '520px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#ffffff', zIndex: 10 }}>
                  <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    {columns.map((col) => (
                      <th key={col} style={{ padding: '10px 14px', fontWeight: '700' }}>
                        {col.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {queryData.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      {columns.map((col) => (
                        <td key={col} style={{ padding: '10px 14px', fontFamily: typeof row[col] === 'number' ? 'monospace' : 'inherit' }}>
                          {row[col] !== null && row[col] !== undefined ? String(row[col]) : '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
