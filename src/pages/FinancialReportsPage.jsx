import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { supabase } from '../lib/supabase'
import {
  calculateProfitAndLoss,
  calculateBalanceSheet,
  calculateCashFlow,
  calculateKeyMetrics,
} from '../utils/financialReports'

export default function FinancialReportsPage() {
  const { user } = useStore()
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

  const [transactions, setTransactions] = useState([])
  const [accounts, setAccounts] = useState([])
  const [invoices, setInvoices] = useState([])

  const [plData, setPlData] = useState(null)
  const [bsData, setBsData] = useState(null)
  const [cfData, setCfData] = useState(null)
  const [metrics, setMetrics] = useState(null)

  useEffect(() => {
    if (user) loadFinancialData()
  }, [user?.id, startDate, endDate])

  const loadFinancialData = async () => {
    setLoading(true)
    try {
      // Load transactions
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('posted_date', startDate)
        .lte('posted_date', endDate)

      // Load accounts
      const { data: acctData } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)

      // Load invoices
      const { data: invData } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)

      setTransactions(txData || [])
      setAccounts(acctData || [])
      setInvoices(invData || [])

      // Calculate reports
      setPlData(calculateProfitAndLoss(txData || [], startDate, endDate))
      setBsData(calculateBalanceSheet(acctData || [], endDate))
      setCfData(calculateCashFlow(txData || [], startDate, endDate))
      setMetrics(calculateKeyMetrics(txData || [], acctData || [], invData || []))
    } catch (err) {
      console.error('Load financial data error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fmt = (n) => `$${parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Financial Reports</h1>
      </div>

      {/* Date Range Selector */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 flex gap-4 items-end">
        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-1 px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 outline-none"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-1 px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-950 outline-none"
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-neutral-200 dark:border-neutral-800">
        {['overview', 'income', 'balance', 'cashflow'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 border-b-2 transition font-medium capitalize ${
              activeTab === tab
                ? 'border-neutral-900 dark:border-white text-neutral-900 dark:text-white'
                : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {tab === 'income' ? 'Profit & Loss' : tab === 'balance' ? 'Balance Sheet' : tab === 'cashflow' ? 'Cash Flow' : 'Overview'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-neutral-500">Loading reports...</div>
      ) : (
        <>
          {/* OVERVIEW */}
          {activeTab === 'overview' && metrics && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
                  <div className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">This Month Revenue</div>
                  <div className="text-3xl font-bold text-neutral-900 dark:text-white mt-2">{fmt(metrics.currentMonth.revenue)}</div>
                  <div className="text-xs text-neutral-500 mt-1">vs ${metrics.lastMonth.revenue.toFixed(2)} last month</div>
                </div>

                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
                  <div className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">Net Profit</div>
                  <div className={`text-3xl font-bold mt-2 ${metrics.currentMonth.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fmt(metrics.currentMonth.profit)}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">{metrics.currentMonth.margin}% margin</div>
                </div>

                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
                  <div className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">Cash Balance</div>
                  <div className="text-3xl font-bold text-neutral-900 dark:text-white mt-2">{fmt(metrics.cashBalance)}</div>
                </div>

                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5">
                  <div className="text-sm text-neutral-600 dark:text-neutral-400 font-medium">Outstanding Invoices</div>
                  <div className="text-3xl font-bold text-neutral-900 dark:text-white mt-2">{metrics.outstandingInvoices.active}</div>
                  <div className="text-xs text-red-600 mt-1">{metrics.outstandingInvoices.overdue} overdue</div>
                </div>
              </div>
            </div>
          )}

          {/* PROFIT & LOSS */}
          {activeTab === 'income' && plData && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-4">
              <h2 className="font-semibold text-neutral-900 dark:text-white">Profit & Loss Statement</h2>
              <div className="space-y-3 divide-y divide-neutral-200 dark:divide-neutral-800">
                <div className="flex justify-between py-2">
                  <span className="text-neutral-600 dark:text-neutral-400">Revenue</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{fmt(plData.income)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-neutral-600 dark:text-neutral-400">Cost of Goods Sold</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{fmt(plData.costOfGoodsSold)}</span>
                </div>
                <div className="flex justify-between py-2 bg-neutral-50 dark:bg-neutral-800/30 px-3">
                  <span className="font-medium text-neutral-900 dark:text-white">Gross Profit</span>
                  <span className="font-bold text-neutral-900 dark:text-white">{fmt(plData.grossProfit)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-neutral-600 dark:text-neutral-400">Operating Expenses</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{fmt(plData.operatingExpenses)}</span>
                </div>
                <div className="flex justify-between py-2 bg-neutral-900 dark:bg-neutral-700 px-3 text-white">
                  <span className="font-bold">Net Income</span>
                  <span className="font-bold">{fmt(plData.netIncome)}</span>
                </div>
                <div className="flex justify-between py-2 text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">Net Margin</span>
                  <span className="text-neutral-900 dark:text-white">{plData.netMargin}%</span>
                </div>
              </div>
            </div>
          )}

          {/* BALANCE SHEET */}
          {activeTab === 'balance' && bsData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* ASSETS */}
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Assets</h3>
                  <div className="space-y-2 mb-4">
                    {bsData.assets.accounts.map((account) => (
                      <div key={account.id} className="flex justify-between text-sm">
                        <span className="text-neutral-600 dark:text-neutral-400">{account.name}</span>
                        <span className="text-neutral-900 dark:text-white">{fmt(account.balance)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
                    <div className="flex justify-between font-bold">
                      <span className="text-neutral-900 dark:text-white">Total Assets</span>
                      <span className="text-neutral-900 dark:text-white">{fmt(bsData.assets.total)}</span>
                    </div>
                  </div>
                </div>

                {/* LIABILITIES */}
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Liabilities</h3>
                  <div className="space-y-2 mb-4">
                    {bsData.liabilities.accounts.map((account) => (
                      <div key={account.id} className="flex justify-between text-sm">
                        <span className="text-neutral-600 dark:text-neutral-400">{account.name}</span>
                        <span className="text-neutral-900 dark:text-white">{fmt(account.balance)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
                    <div className="flex justify-between font-bold">
                      <span className="text-neutral-900 dark:text-white">Total Liabilities</span>
                      <span className="text-neutral-900 dark:text-white">{fmt(bsData.liabilities.total)}</span>
                    </div>
                  </div>
                </div>

                {/* EQUITY */}
                <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-4">Equity</h3>
                  <div className="space-y-2 mb-4">
                    {bsData.equity.accounts.map((account) => (
                      <div key={account.id} className="flex justify-between text-sm">
                        <span className="text-neutral-600 dark:text-neutral-400">{account.name}</span>
                        <span className="text-neutral-900 dark:text-white">{fmt(account.balance)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800">
                    <div className="flex justify-between font-bold">
                      <span className="text-neutral-900 dark:text-white">Total Equity</span>
                      <span className="text-neutral-900 dark:text-white">{fmt(bsData.equity.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {!bsData.isBalanced && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <p className="text-sm text-red-700 dark:text-red-400">
                    ⚠️ Balance sheet is not balanced. Assets ≠ Liabilities + Equity
                  </p>
                </div>
              )}
            </div>
          )}

          {/* CASH FLOW */}
          {activeTab === 'cashflow' && cfData && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 space-y-4">
              <h2 className="font-semibold text-neutral-900 dark:text-white">Cash Flow Statement</h2>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-neutral-900 dark:text-white mb-3">Operating Activities</h4>
                  <div className="space-y-2 divide-y divide-neutral-200 dark:divide-neutral-800">
                    <div className="flex justify-between py-2">
                      <span className="text-neutral-600 dark:text-neutral-400">Cash Inflows</span>
                      <span className="text-green-600 font-medium">+ {fmt(cfData.operatingActivities.inflows)}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-neutral-600 dark:text-neutral-400">Cash Outflows</span>
                      <span className="text-red-600 font-medium">- {fmt(cfData.operatingActivities.outflows)}</span>
                    </div>
                    <div className="flex justify-between py-2 bg-neutral-50 dark:bg-neutral-800/30 px-3">
                      <span className="font-medium text-neutral-900 dark:text-white">Net Operating Cash Flow</span>
                      <span className={`font-bold ${cfData.operatingActivities.netCash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {fmt(cfData.operatingActivities.netCash)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-neutral-900 dark:bg-neutral-700 text-white px-4 py-3 rounded-lg flex justify-between">
                  <span className="font-bold">Total Net Cash Flow</span>
                  <span className="font-bold">{fmt(cfData.netCashFlow)}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
