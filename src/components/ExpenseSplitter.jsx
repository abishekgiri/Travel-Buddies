import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { API_URL, createAuthHeaders } from '../config';
import './ExpenseSplitter.css';

const ExpenseSplitter = ({ budgetId, tripId, currency, onExpenseAdded, onCancel }) => {
    const { user } = useAuth();
    const [members, setMembers] = useState([]);
    const [formData, setFormData] = useState({
        category: 'Food',
        amount: '',
        description: '',
        paid_by: user?.id || '',
        split_among: [],
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        const loadTripMembers = async () => {
            try {
                const response = await fetch(`${API_URL}/api/trips/${tripId}/members`, {
                    headers: createAuthHeaders()
                });
                const data = await response.json();
                if (!response.ok || !Array.isArray(data)) {
                    throw new Error(data.error || 'Failed to load trip members');
                }

                setMembers(data);
                setFormData((prev) => ({
                    ...prev,
                    paid_by: prev.paid_by || user?.id || '',
                    split_among: data.map((member) => member.id)
                }));
            } catch (error) {
                console.error('Error fetching members:', error);
                alert(error.message || 'Error fetching trip members');
            }
        };

        if (tripId) {
            loadTripMembers();
        }
    }, [tripId, user?.id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.split_among.length === 0) {
            alert('Select at least one trip member to split this expense with.');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/budgets/${budgetId}/expenses`, {
                method: 'POST',
                headers: createAuthHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    ...formData,
                    currency
                }),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.error || 'Failed to add expense');
            }

            onExpenseAdded();
        } catch (error) {
            console.error('Error adding expense:', error);
            alert(error.message || 'Error adding expense');
        }
    };

    const toggleMember = (memberId) => {
        setFormData(prev => ({
            ...prev,
            split_among: prev.split_among.includes(memberId)
                ? prev.split_among.filter(id => id !== memberId)
                : [...prev.split_among, memberId]
        }));
    };

    const splitAmount = formData.amount && formData.split_among.length > 0
        ? (parseFloat(formData.amount) / formData.split_among.length).toFixed(2)
        : 0;

    return (
        <div className="expense-splitter">
            <h4>Add New Expense</h4>
            <form onSubmit={handleSubmit}>
                <div className="form-row">
                    <div className="form-group">
                        <label>Category</label>
                        <select
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        >
                            <option value="Food">🍔 Food</option>
                            <option value="Transport">🚗 Transport</option>
                            <option value="Accommodation">🏨 Accommodation</option>
                            <option value="Activities">🎯 Activities</option>
                            <option value="Shopping">🛍️ Shopping</option>
                            <option value="Other">📌 Other</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Amount ({currency})</label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Date</label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            required
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label>Description</label>
                    <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Dinner at Italian restaurant"
                    />
                </div>

                <div className="form-group">
                    <label>Paid By</label>
                    <select
                        value={formData.paid_by}
                        onChange={(e) => setFormData({ ...formData, paid_by: parseInt(e.target.value) })}
                    >
                        {members.map(member => (
                            <option key={member.id} value={member.id}>{member.name}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Split Among ({formData.split_among.length} people - {currency} {splitAmount} each)</label>
                    <div className="members-checkboxes">
                        {members.map(member => (
                            <label key={member.id} className="member-checkbox">
                                <input
                                    type="checkbox"
                                    checked={formData.split_among.includes(member.id)}
                                    onChange={() => toggleMember(member.id)}
                                />
                                <span>{member.name}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="form-actions">
                    <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
                    <button type="submit" className="btn-primary">Add Expense</button>
                </div>
            </form>
        </div>
    );
};

export default ExpenseSplitter;
