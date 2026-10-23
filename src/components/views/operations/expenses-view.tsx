'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useFleet } from '@/context/fleet-context';
import { Panel } from '@/components/common/panel';
import { KpiCard } from '@/components/common/kpi-card';
import { DataTable } from '@/components/common/data-table';
import { Modal } from '@/components/common/modal';
import { Trend } from '@/components/common/charts';
import { Plus, Wallet, Clock, CheckCircle } from 'lucide-react';
import { Expense } from '@/types';
import { demoDate } from '@/data/uae-records';

interface ExpensesViewProps {
  showToast: (msg: string) => void;
}

export function ExpensesView({ showToast }: ExpensesViewProps) {
  const { user, permissions, role } = useAuth();
  const { expenses, addExpense, approveExpense, rejectExpense, vehicles } = useFleet();

  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'Fuel' | 'Maintenance' | 'Tolls' | 'Insurance' | 'Other'>('Fuel');
  const [vehicle, setVehicle] = useState(vehicles[0]?.registration || 'Dubai A-10842');
  const [amount, setAmount] = useState<number>(350);
  const [date, setDate] = useState(demoDate);
  const [receipt, setReceipt] = useState('ENOC Tax Invoice Attached');

  const isEmployee = role === 'Employee';

  // Filter expenses: Employees see only their submitted records
  const visibleExpenses = isEmployee
    ? expenses.filter((e) => e.submitted === user?.name)
    : expenses;

  const filtered = visibleExpenses.filter((e) => {
    const matchStatus = statusFilter === 'All' || e.status === statusFilter;
    const matchCategory = categoryFilter === 'All' || e.category === categoryFilter;
    return matchStatus && matchCategory;
  });

  const totalAmount = visibleExpenses.reduce((s, e) => s + e.amount, 0);
  const pendingCount = visibleExpenses.filter((e) => e.status === 'Pending').length;
  const approvedCount = visibleExpenses.filter((e) => e.status === 'Approved').length;

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount) return;

    addExpense({
      title: title.trim(),
      category,
      vehicle,
      amount: Number(amount),
      date,
      submitted: user?.name || 'Zayed Al Mansoori',
      receipt: receipt.trim() || 'Attached (Demo Invoice)'
    });

    setShowAddModal(false);
    setTitle('');
    setAmount(350);
    showToast(`Expense of AED ${amount} submitted for approval`);
  };

  const handleApprove = (exp: Expense) => {
    approveExpense(exp.id, user?.name || 'Authorized Approver');
    showToast(`Approved expense: ${exp.title} (AED ${exp.amount})`);
  };

  const handleReject = (exp: Expense) => {
    rejectExpense(exp.id, user?.name || 'Authorized Approver');
    showToast(`Rejected expense: ${exp.title}`);
  };

  return (
    <>
      <div className="module-toolbar">
        <div className="filters">
          <select
            aria-label="Filter status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending Approval</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>

          <select
            aria-label="Filter category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="All">All Categories</option>
            <option value="Fuel">Fuel</option>
            <option value="Tolls">Tolls (Salik / Darb)</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Insurance">Insurance</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <button
          type="button"
          className="button primary"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={15} /> Submit Expense
        </button>
      </div>

      <div className="three-grid">
        <KpiCard
          label={isEmployee ? 'My Total Submitted' : 'Fleet Total Expenditure'}
          value={`AED ${totalAmount.toLocaleString('en-AE')}`}
          icon={Wallet}
          note="Currency standard: United Arab Emirates Dirham"
          tone="navy"
        />
        <KpiCard
          label="Pending Review"
          value={pendingCount}
          icon={Clock}
          note={isEmployee ? 'Awaiting manager approval' : 'Require managerial sign-off'}
          tone={pendingCount > 0 ? 'gold' : 'green'}
        />
        <KpiCard
          label="Approved Expenses"
          value={approvedCount}
          icon={CheckCircle}
          note="Verified and scheduled for payout"
          tone="green"
        />
      </div>

      {/* Expense Trends */}
      {!isEmployee && (
        <Panel title="UAE Daily Operational Spend (AED)" sub="Aggregate fleet expenses">
          <Trend type="expenses" bar days={7} unit="AED" />
        </Panel>
      )}

      {/* Expenses Table */}
      <Panel
        title={isEmployee ? 'My Expense Reimbursements' : 'Fleet Expense Claims'}
        sub={`${filtered.length} claims in view`}
      >
        <DataTable
          rows={filtered}
          columns={[
            ['title', 'Expense Description'],
            ['category', 'Category'],
            ['vehicle', 'Target Vehicle'],
            ['amount', 'Amount (AED)'],
            ['date', 'Date'],
            ['submitted', 'Submitted By'],
            ['status', 'Approval Status']
          ]}
          exportable
          exportName="trackwe-uae-expenses"
          action={(exp: Expense) => {
            if (permissions?.canApproveExpenses && exp.status === 'Pending') {
              return (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    className="button small"
                    onClick={() => handleApprove(exp)}
                    style={{ color: '#2d8c75', borderColor: '#d1fae5' }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="button small"
                    onClick={() => handleReject(exp)}
                    style={{ color: '#c47b6b', borderColor: '#fee2e2' }}
                  >
                    Reject
                  </button>
                </div>
              );
            }
            return null;
          }}
        />
      </Panel>

      {/* Category Breakdown */}
      <Panel title="Expense Allocation by Category (AED)">
        <div className="category-grid">
          {(['Fuel', 'Tolls', 'Maintenance', 'Insurance', 'Other'] as const).map(
            (cat) => {
              const catTotal = visibleExpenses
                .filter((e) => e.category === cat)
                .reduce((s, e) => s + e.amount, 0);
              return (
                <div key={cat}>
                  <span>{cat.toUpperCase()}</span>
                  <strong>AED {catTotal.toLocaleString('en-AE')}</strong>
                </div>
              );
            }
          )}
        </div>
      </Panel>

      {/* Add Expense Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Submit Operational Fleet Expense"
      >
        <form onSubmit={handleCreateExpense}>
          <div className="form-grid">
            <label style={{ gridColumn: '1 / -1' }}>
              Expense Title / Description
              <input
                required
                placeholder="e.g. Diesel Refill at ENOC Station 104"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>

            <label>
              Category
              <select
                value={category}
                onChange={(e) =>
                  setCategory(
                    e.target.value as 'Fuel' | 'Maintenance' | 'Tolls' | 'Insurance' | 'Other'
                  )
                }
              >
                <option value="Fuel">Fuel</option>
                <option value="Tolls">Tolls (Salik / Darb)</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Insurance">Insurance</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label>
              Related UAE Vehicle
              <select
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.registration}>
                    {v.registration} — {v.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Amount in UAE Dirham (AED)
              <input
                type="number"
                min={1}
                step="0.5"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </label>

            <label>
              Transaction Date
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>

            <label style={{ gridColumn: '1 / -1' }}>
              Receipt Tax Invoice Note
              <input
                required
                value={receipt}
                onChange={(e) => setReceipt(e.target.value)}
              />
            </label>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="button"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </button>
            <button type="submit" className="button primary">
              Submit Expense for Approval
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
