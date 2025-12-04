const express = require('express');
const router = express.Router();
const db = require('../database.cjs');
const axios = require('axios');

// Get budget for a trip
router.get('/:tripId', (req, res) => {
    const { tripId } = req.params;

    db.get('SELECT * FROM budgets WHERE trip_id = ?', [tripId], (err, budget) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!budget) {
            return res.status(404).json({ error: 'Budget not found' });
        }

        // Get all expenses for this budget
        db.all('SELECT e.*, u.name as payer_name FROM expenses e JOIN users u ON e.paid_by = u.id WHERE e.budget_id = ? ORDER BY e.date DESC',
            [budget.id],
            (err, expenses) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ budget, expenses });
            }
        );
    });
});

// Create budget for a trip
router.post('/', (req, res) => {
    const { trip_id, total_budget, currency, created_by } = req.body;

    if (!trip_id || !total_budget || !created_by) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    db.run(
        'INSERT INTO budgets (trip_id, total_budget, currency, created_by) VALUES (?, ?, ?, ?)',
        [trip_id, total_budget, currency || 'USD', created_by],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ id: this.lastID, trip_id, total_budget, currency: currency || 'USD' });
        }
    );
});

// Update budget
router.put('/:id', (req, res) => {
    const { id } = req.params;
    const { total_budget, currency } = req.body;

    db.run(
        'UPDATE budgets SET total_budget = ?, currency = ? WHERE id = ?',
        [total_budget, currency, id],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Budget not found' });
            }
            res.json({ message: 'Budget updated successfully' });
        }
    );
});

// Add expense
router.post('/:id/expenses', (req, res) => {
    const { id } = req.params;
    const { category, amount, currency, description, paid_by, split_among, date } = req.body;

    if (!category || !amount || !paid_by || !date) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const splitJson = JSON.stringify(split_among || []);

    db.run(
        'INSERT INTO expenses (budget_id, category, amount, currency, description, paid_by, split_among, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [id, category, amount, currency || 'USD', description, paid_by, splitJson, date],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Get the created expense with payer name
            db.get('SELECT e.*, u.name as payer_name FROM expenses e JOIN users u ON e.paid_by = u.id WHERE e.id = ?',
                [this.lastID],
                (err, expense) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }
                    res.status(201).json(expense);
                }
            );
        }
    );
});

// Get all expenses for a budget
router.get('/:id/expenses', (req, res) => {
    const { id } = req.params;

    db.all(
        'SELECT e.*, u.name as payer_name FROM expenses e JOIN users u ON e.paid_by = u.id WHERE e.budget_id = ? ORDER BY e.date DESC',
        [id],
        (err, expenses) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(expenses);
        }
    );
});

// Delete expense
router.delete('/expenses/:id', (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM expenses WHERE id = ?', [id], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Expense not found' });
        }
        res.json({ message: 'Expense deleted successfully' });
    });
});

// Calculate expense splits
router.get('/:id/split', (req, res) => {
    const { id } = req.params;

    db.all(
        'SELECT * FROM expenses WHERE budget_id = ?',
        [id],
        (err, expenses) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            // Calculate who owes whom
            const balances = {};

            expenses.forEach(expense => {
                const splitAmong = JSON.parse(expense.split_among || '[]');
                if (splitAmong.length === 0) return;

                const sharePerPerson = expense.amount / splitAmong.length;

                // Payer is owed money
                balances[expense.paid_by] = (balances[expense.paid_by] || 0) + expense.amount;

                // Each person owes their share
                splitAmong.forEach(userId => {
                    balances[userId] = (balances[userId] || 0) - sharePerPerson;
                });
            });

            // Convert to settlements (who owes whom)
            const settlements = [];
            const debtors = [];
            const creditors = [];

            Object.entries(balances).forEach(([userId, balance]) => {
                if (balance < -0.01) {
                    debtors.push({ userId: parseInt(userId), amount: -balance });
                } else if (balance > 0.01) {
                    creditors.push({ userId: parseInt(userId), amount: balance });
                }
            });

            // Match debtors with creditors
            debtors.forEach(debtor => {
                let remaining = debtor.amount;
                creditors.forEach(creditor => {
                    if (remaining > 0.01 && creditor.amount > 0.01) {
                        const settlement = Math.min(remaining, creditor.amount);
                        settlements.push({
                            from: debtor.userId,
                            to: creditor.userId,
                            amount: Math.round(settlement * 100) / 100
                        });
                        remaining -= settlement;
                        creditor.amount -= settlement;
                    }
                });
            });

            // Get user names for settlements
            const userIds = [...new Set(settlements.flatMap(s => [s.from, s.to]))];
            if (userIds.length === 0) {
                return res.json({ balances, settlements: [] });
            }

            const placeholders = userIds.map(() => '?').join(',');
            db.all(
                `SELECT id, name FROM users WHERE id IN (${placeholders})`,
                userIds,
                (err, users) => {
                    if (err) {
                        return res.status(500).json({ error: err.message });
                    }

                    const userMap = {};
                    users.forEach(u => {
                        userMap[u.id] = u.name;
                    });

                    settlements.forEach(s => {
                        s.fromName = userMap[s.from];
                        s.toName = userMap[s.to];
                    });

                    res.json({ balances, settlements });
                }
            );
        }
    );
});

// Currency conversion endpoint
router.get('/currency/convert', async (req, res) => {
    const { from, to, amount } = req.query;

    if (!from || !to || !amount) {
        return res.status(400).json({ error: 'Missing required parameters: from, to, amount' });
    }

    try {
        const response = await axios.get(`https://api.exchangerate-api.com/v4/latest/${from}`);
        const rate = response.data.rates[to];

        if (!rate) {
            return res.status(400).json({ error: 'Invalid currency code' });
        }

        const converted = parseFloat(amount) * rate;
        res.json({
            from,
            to,
            amount: parseFloat(amount),
            rate,
            converted: Math.round(converted * 100) / 100
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch exchange rates' });
    }
});

// Settle up (record a payment)
router.post('/settle', (req, res) => {
    const { budget_id, from_user, to_user, amount, currency } = req.body;

    if (!budget_id || !from_user || !to_user || !amount) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    db.run(
        'INSERT INTO expenses (budget_id, category, amount, currency, description, paid_by, split_among, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
            budget_id,
            'Settlement',
            amount,
            currency || 'USD',
            'Payment to settle debt',
            from_user,
            JSON.stringify([to_user]), // Split with the person being paid, effectively transferring value
            new Date().toISOString().split('T')[0]
        ],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, message: 'Settlement recorded' });
        }
    );
});

module.exports = router;
