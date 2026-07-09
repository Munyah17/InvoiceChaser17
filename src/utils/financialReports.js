/**
 * Financial Reports Engine
 * Calculates P&L, Balance Sheet, and Cash Flow from transactions
 */

export function calculateProfitAndLoss(transactions = [], startDate, endDate) {
  // P&L = Revenue - Expenses
  const filtered = transactions.filter((t) => {
    const tDate = new Date(t.posted_date)
    return tDate >= new Date(startDate) && tDate <= new Date(endDate)
  })

  const income = filtered
    .filter((t) => t.type === 'invoice' || (t.type === 'journal' && t.amount > 0))
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)

  const expenses = filtered
    .filter((t) => t.type === 'expense' || (t.type === 'journal' && t.amount < 0))
    .reduce((sum, t) => sum + parseFloat(Math.abs(t.amount) || 0), 0)

  const cogs = 0 // Cost of Goods Sold - for future inventory tracking
  const grossProfit = income - cogs
  const operatingProfit = grossProfit - expenses
  const netIncome = operatingProfit

  return {
    period: `${startDate} to ${endDate}`,
    income: parseFloat(income.toFixed(2)),
    costOfGoodsSold: cogs,
    grossProfit: parseFloat(grossProfit.toFixed(2)),
    operatingExpenses: parseFloat(expenses.toFixed(2)),
    operatingIncome: parseFloat(operatingProfit.toFixed(2)),
    netIncome: parseFloat(netIncome.toFixed(2)),
    netMargin: income > 0 ? parseFloat(((netIncome / income) * 100).toFixed(2)) : 0,
  }
}

export function calculateBalanceSheet(accounts = [], asOfDate) {
  // Balance Sheet = Assets - (Liabilities + Equity)
  const assets = accounts
    .filter((a) => a.type === 'asset')
    .reduce((sum, a) => sum + parseFloat(a.balance || 0), 0)

  const liabilities = accounts
    .filter((a) => a.type === 'liability')
    .reduce((sum, a) => sum + parseFloat(a.balance || 0), 0)

  const equity = accounts
    .filter((a) => a.type === 'equity')
    .reduce((sum, a) => sum + parseFloat(a.balance || 0), 0)

  const totalAssets = parseFloat(assets.toFixed(2))
  const totalLiabilities = parseFloat(liabilities.toFixed(2))
  const totalEquity = parseFloat(equity.toFixed(2))

  return {
    asOfDate,
    assets: {
      total: totalAssets,
      accounts: accounts.filter((a) => a.type === 'asset'),
    },
    liabilities: {
      total: totalLiabilities,
      accounts: accounts.filter((a) => a.type === 'liability'),
    },
    equity: {
      total: totalEquity,
      accounts: accounts.filter((a) => a.type === 'equity'),
    },
    totalLiabilitiesAndEquity: parseFloat((totalLiabilities + totalEquity).toFixed(2)),
    isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
  }
}

export function calculateCashFlow(transactions = [], startDate, endDate) {
  // Cash Flow = Inflows (payments received) - Outflows (bills paid, expenses paid)
  const filtered = transactions.filter((t) => {
    const tDate = new Date(t.posted_date)
    return tDate >= new Date(startDate) && tDate <= new Date(endDate)
  })

  const operatingInflows = filtered
    .filter((t) => t.type === 'payment')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)

  const operatingOutflows = filtered
    .filter((t) => t.type === 'expense' || t.type === 'bill')
    .reduce((sum, t) => sum + parseFloat(Math.abs(t.amount) || 0), 0)

  const investingCashFlow = 0 // For future asset purchases
  const financingCashFlow = 0 // For future loans/equity

  const operatingCashFlow = parseFloat((operatingInflows - operatingOutflows).toFixed(2))
  const netCashFlow = parseFloat((operatingCashFlow + investingCashFlow + financingCashFlow).toFixed(2))

  return {
    period: `${startDate} to ${endDate}`,
    operatingActivities: {
      inflows: parseFloat(operatingInflows.toFixed(2)),
      outflows: parseFloat(operatingOutflows.toFixed(2)),
      netCash: operatingCashFlow,
    },
    investingActivities: {
      netCash: investingCashFlow,
    },
    financingActivities: {
      netCash: financingCashFlow,
    },
    netCashFlow,
    positiveCashFlow: netCashFlow > 0,
  }
}

export function calculateAgingReport(invoices = [], type = 'receivable') {
  // Aging = categorize by how long overdue
  const today = new Date()
  const current = invoices.filter((inv) => {
    const daysOverdue = Math.floor((today - new Date(inv.due_date)) / (1000 * 60 * 60 * 24))
    return daysOverdue <= 0
  })

  const days30 = invoices.filter((inv) => {
    const daysOverdue = Math.floor((today - new Date(inv.due_date)) / (1000 * 60 * 60 * 24))
    return daysOverdue > 0 && daysOverdue <= 30
  })

  const days60 = invoices.filter((inv) => {
    const daysOverdue = Math.floor((today - new Date(inv.due_date)) / (1000 * 60 * 60 * 24))
    return daysOverdue > 30 && daysOverdue <= 60
  })

  const days90 = invoices.filter((inv) => {
    const daysOverdue = Math.floor((today - new Date(inv.due_date)) / (1000 * 60 * 60 * 24))
    return daysOverdue > 60 && daysOverdue <= 90
  })

  const over90 = invoices.filter((inv) => {
    const daysOverdue = Math.floor((today - new Date(inv.due_date)) / (1000 * 60 * 60 * 24))
    return daysOverdue > 90
  })

  const sumAmount = (arr) => arr.reduce((sum, inv) => sum + parseFloat(inv.amount || 0), 0)

  return {
    type,
    buckets: {
      current: { count: current.length, amount: parseFloat(sumAmount(current).toFixed(2)) },
      days30: { count: days30.length, amount: parseFloat(sumAmount(days30).toFixed(2)) },
      days60: { count: days60.length, amount: parseFloat(sumAmount(days60).toFixed(2)) },
      days90: { count: days90.length, amount: parseFloat(sumAmount(days90).toFixed(2)) },
      over90: { count: over90.length, amount: parseFloat(sumAmount(over90).toFixed(2)) },
    },
    totalOutstanding: parseFloat(sumAmount(invoices).toFixed(2)),
    overdueAmount: parseFloat(sumAmount([...days30, ...days60, ...days90, ...over90]).toFixed(2)),
  }
}

export function calculateKeyMetrics(transactions = [], accounts = [], invoices = []) {
  // KPI calculations
  const today = new Date()
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)

  const thisMonthTx = transactions.filter((t) => new Date(t.posted_date) >= thisMonth)
  const lastMonthTx = transactions.filter(
    (t) => new Date(t.posted_date) >= lastMonth && new Date(t.posted_date) < thisMonth
  )

  const revenue = thisMonthTx
    .filter((t) => t.type === 'invoice' || t.type === 'payment')
    .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)

  const expenses = thisMonthTx
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + parseFloat(Math.abs(t.amount) || 0), 0)

  const cashBalance = accounts
    .filter((a) => a.type === 'asset')
    .reduce((sum, a) => sum + parseFloat(a.balance || 0), 0)

  const activeInvoices = invoices.filter((i) => i.status === 'pending' || i.status === 'overdue')
  const overdueInvoices = invoices.filter((i) => i.status === 'overdue')

  return {
    currentMonth: {
      revenue: parseFloat(revenue.toFixed(2)),
      expenses: parseFloat(expenses.toFixed(2)),
      profit: parseFloat((revenue - expenses).toFixed(2)),
      margin: revenue > 0 ? parseFloat(((revenue - expenses) / revenue * 100).toFixed(2)) : 0,
    },
    lastMonth: {
      revenue: parseFloat(
        lastMonthTx
          .filter((t) => t.type === 'invoice' || t.type === 'payment')
          .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
          .toFixed(2)
      ),
    },
    cashBalance: parseFloat(cashBalance.toFixed(2)),
    outstandingInvoices: {
      active: activeInvoices.length,
      overdue: overdueInvoices.length,
      amount: parseFloat(
        activeInvoices.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0).toFixed(2)
      ),
    },
  }
}
