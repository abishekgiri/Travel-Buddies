import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';
import ExpenseSplitter from '../components/ExpenseSplitter';
import CurrencyConverter from '../components/CurrencyConverter';
import './BudgetPlanner.css';

const BudgetPlanner = () => {
    const { tripId } = useParams();
    const { user } = useAuth();
    const [budget, setBudget] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [trip, setTrip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [settlements, setSettlements] = useState([]);

    useEffect(() => {
        fetchBudget();
        fetchTrip();
    }, [tripId]);

    const fetchTrip = async () => {
        try {
            const response = await fetch(`${API_URL}/api/trips/${tripId}`);
            const data = await response.json();
            setTrip(data);
        } catch (error) {
            console.error('Error fetching trip:', error);
        }
    };

    const fetchBudget = async () => {
        try {
            const response = await fetch(`${API_URL}/api/budgets/${tripId}`);
            if (response.ok) {
                const data = await response.json();
                setBudget(data.budget);
                setExpenses(data.expenses);
                fetchSettlements(data.budget.id);
            } else if (response.status === 404) {
                // No budget yet
                setBudget(null);
                setExpenses([]);
            }
        } catch (error) {
            console.error('Error fetching budget:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSettlements = async (budgetId) => {
        try {
            const response = await fetch(`${API_URL}/api/budgets/${budgetId}/split`);
            const data = await response.json();
            setSettlements(data.settlements || []);
        } catch (error) {
            console.error('Error fetching settlements:', error);
        }
    };

    const createBudget = async (amount, currency) => {
        try {
            const response = await fetch(`${API_URL}/api/budgets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    trip_id: tripId,
                    total_budget: amount,
                    currency: currency,
                    created_by: user.id
                }),
            });

            if (response.ok) {
                await fetchBudget();
            }
        } catch (error) {
            console.error('Error creating budget:', error);
        }
    };

    const handleExpenseAdded = () => {
        fetchBudget();
        setShowAddExpense(false);
    };

    const totalSpent = expenses.reduce((sum, exp) => {
        // Convert to budget currency if different
        return sum + parseFloat(exp.amount);
    }, 0);

    const remaining = budget ? budget.total_budget - totalSpent : 0;
    const percentSpent = budget ? (totalSpent / budget.total_budget) * 100 : 0;

    const categoryTotals = expenses.reduce((acc, exp) => {
        acc[exp.category] = (acc[exp.category] || 0) + parseFloat(exp.amount);
        return acc;
    }, {});

    if (loading) return <div className="container">Loading...</div>;

    return (
        <div className="budget-planner container">
            <div className="budget-header">
                <h1>💰 Budget Planner</h1>
                {trip && <p className="trip-name">{trip.title}</p>}
                <Link to={`/trips/${tripId}`} className="btn-secondary">← Back to Trip</Link>
            </div>

            {!budget ? (
                <div className="budget-create glass">
                    <h2>Create Budget</h2>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        const amount = e.target.amount.value;
                        const currency = e.target.currency.value;
                        createBudget(amount, currency);
                    }}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Total Budget</label>
                                <input name="amount" type="number" step="0.01" required placeholder="1000" />
                            </div>
                            <div className="form-group">
                                <label>Currency</label>
                                <select name="currency">
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="GBP">GBP (£)</option>
                                    <option value="JPY">JPY (¥)</option>
                                    <option value="INR">INR (₹)</option>
                                </select>
                            </div>
                        </div>
                        <button type="submit" className="btn-primary">Create Budget</button>
                    </form>
                </div>
            ) : (
                <>
                    {/* Budget Overview */}
                    <div className="budget-overview glass">
                        <div className="budget-stats">
                            <div className="stat">
                                <span className="stat-label">Total Budget</span>
                                <span className="stat-value">{budget.currency} {budget.total_budget.toFixed(2)}</span>
                            </div>
                            <div className="stat">
                                <span className="stat-label">Spent</span>
                                <span className="stat-value spent">{budget.currency} {totalSpent.toFixed(2)}</span>
                            </div>
                            <div className="stat">
                                <span className="stat-label">Remaining</span>
                                <span className={`stat-value ${remaining < 0 ? 'overspent' : 'remaining'}`}>
                                    {budget.currency} {remaining.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <div className="progress-bar">
                            <div
                                className={`progress-fill ${percentSpent > 100 ? 'overspent' : ''}`}
                                style={{ width: `${Math.min(percentSpent, 100)}%` }}
                            ></div>
                        </div>
                        <p className="progress-text">{percentSpent.toFixed(1)}% spent</p>
                    </div>

                    {/* Category Breakdown */}
                    {Object.keys(categoryTotals).length > 0 && (
                        <div className="category-breakdown glass">
                            <h3>Spending by Category</h3>
                            <div className="categories">
                                {Object.entries(categoryTotals).map(([category, total]) => (
                                    <div key={category} className="category-item">
                                        <span className="category-name">{category}</span>
                                        <span className="category-amount">{budget.currency} {total.toFixed(2)}</span>
                                        <div className="category-bar">
                                            <div
                                                className="category-fill"
                                                style={{ width: `${(total / budget.total_budget) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Settlements */}
                    {settlements.length > 0 && (
                        <div className="settlements glass">
                            <h3>💸 Who Owes Whom</h3>
                            <div className="settlement-list">
                                {settlements.map((s, idx) => (
                                    <div key={idx} className="settlement-item">
                                        <span className="settlement-from">{s.fromName}</span>
                                        <span className="settlement-arrow">→</span>
                                        <span className="settlement-to">{s.toName}</span>
                                        <span className="settlement-amount">{budget.currency} {s.amount.toFixed(2)}</span>
                                        {user.id === s.from && (
                                            <button
                                                className="btn-primary"
                                                style={{ padding: '4px 10px', fontSize: '0.8rem', marginLeft: '10px' }}
                                                onClick={async () => {
                                                    if (!confirm(`Mark debt of ${s.amount} to ${s.toName} as paid?`)) return;
                                                    try {
                                                        const res = await fetch(`${API_URL}/api/budgets/settle`, {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                budget_id: budget.id,
                                                                from_user: s.from,
                                                                to_user: s.to,
                                                                amount: s.amount,
                                                                currency: budget.currency
                                                            })
                                                        });
                                                        if (res.ok) {
                                                            alert('Settlement recorded!');
                                                            fetchBudget();
                                                        }
                                                    } catch (err) {
                                                        console.error(err);
                                                    }
                                                }}
                                            >
                                                Settle Up
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Expenses */}
                    <div className="expenses-section glass">
                        <div className="expenses-header">
                            <h3>Expenses</h3>
                            <button onClick={() => setShowAddExpense(!showAddExpense)} className="btn-primary">
                                + Add Expense
                            </button>
                        </div>

                        {showAddExpense && (
                            <ExpenseSplitter
                                budgetId={budget.id}
                                tripId={tripId}
                                currency={budget.currency}
                                onExpenseAdded={handleExpenseAdded}
                                onCancel={() => setShowAddExpense(false)}
                            />
                        )}

                        <div className="expenses-list">
                            {expenses.length === 0 ? (
                                <p className="no-expenses">No expenses yet. Add one to get started!</p>
                            ) : (
                                expenses.map(expense => (
                                    <div key={expense.id} className="expense-item">
                                        <div className="expense-main">
                                            <span className="expense-category">{expense.category}</span>
                                            <span className="expense-desc">{expense.description}</span>
                                        </div>
                                        <div className="expense-details">
                                            <span className="expense-payer">Paid by {expense.payer_name}</span>
                                            <span className="expense-date">{new Date(expense.date).toLocaleDateString()}</span>
                                            <span className="expense-amount">{expense.currency} {parseFloat(expense.amount).toFixed(2)}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Currency Converter Widget */}
                    <CurrencyConverter baseCurrency={budget.currency} />
                </>
            )}
        </div>
    );
};

export default BudgetPlanner;
