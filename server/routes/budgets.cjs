const express = require('express');
const router = express.Router();
const db = require('../database.cjs');
const axios = require('axios');
const { verifyToken } = require('../middleware/auth.cjs');

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
    });
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ changes: this.changes, lastID: this.lastID });
    });
});

const isPrivilegedUser = (user) => user && (user.role === 'owner' || user.role === 'admin');

const hasTripAccess = async (tripId, user) => {
    if (isPrivilegedUser(user)) {
        return true;
    }

    const membership = await dbGet(
        'SELECT id FROM trip_members WHERE trip_id = ? AND user_id = ?',
        [tripId, user.id]
    );

    return Boolean(membership);
};

const getBudgetWithTrip = async (budgetId) => dbGet(
    `SELECT b.*, t.creator_id
     FROM budgets b
     JOIN trips t ON b.trip_id = t.id
     WHERE b.id = ?`,
    [budgetId]
);

const hasBudgetAccess = async (budgetId, user) => {
    const budget = await getBudgetWithTrip(budgetId);
    if (!budget) {
        return { budget: null, allowed: false };
    }

    if (isPrivilegedUser(user)) {
        return { budget, allowed: true };
    }

    const membership = await dbGet(
        'SELECT id FROM trip_members WHERE trip_id = ? AND user_id = ?',
        [budget.trip_id, user.id]
    );

    return { budget, allowed: Boolean(membership) };
};

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

// Get budget for a trip
router.get('/:tripId', verifyToken, async (req, res) => {
    const { tripId } = req.params;

    try {
        if (!(await hasTripAccess(tripId, req.user))) {
            return res.status(403).json({ error: 'You do not have access to this budget' });
        }

        const budget = await dbGet('SELECT * FROM budgets WHERE trip_id = ?', [tripId]);
        if (!budget) {
            return res.status(404).json({ error: 'Budget not found' });
        }

        const expenses = await dbAll(
            'SELECT e.*, u.name as payer_name FROM expenses e JOIN users u ON e.paid_by = u.id WHERE e.budget_id = ? ORDER BY e.date DESC',
            [budget.id]
        );

        res.json({ budget, expenses });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create budget for a trip
router.post('/', verifyToken, async (req, res) => {
    const { trip_id, total_budget, currency } = req.body;

    if (!trip_id || !total_budget) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        if (!(await hasTripAccess(trip_id, req.user))) {
            return res.status(403).json({ error: 'You do not have access to this trip budget' });
        }

        const result = await dbRun(
            'INSERT INTO budgets (trip_id, total_budget, currency, created_by) VALUES (?, ?, ?, ?)',
            [trip_id, total_budget, currency || 'USD', req.user.id]
        );

        res.status(201).json({
            id: result.lastID,
            trip_id,
            total_budget,
            currency: currency || 'USD'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update budget
router.put('/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { total_budget, currency } = req.body;

    try {
        const { allowed } = await hasBudgetAccess(id, req.user);
        if (!allowed) {
            return res.status(403).json({ error: 'You do not have access to update this budget' });
        }

        const result = await dbRun(
            'UPDATE budgets SET total_budget = ?, currency = ? WHERE id = ?',
            [total_budget, currency, id]
        );

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Budget not found' });
        }

        res.json({ message: 'Budget updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add expense
router.post('/:id/expenses', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { category, amount, currency, description, paid_by, split_among, date } = req.body;

    if (!category || !amount || !date) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const { budget, allowed } = await hasBudgetAccess(id, req.user);
        if (!allowed) {
            return res.status(403).json({ error: 'You do not have access to add expenses to this budget' });
        }

        const payerId = paid_by || req.user.id;
        const payerMembership = await dbGet(
            'SELECT id FROM trip_members WHERE trip_id = ? AND user_id = ?',
            [budget.trip_id, payerId]
        );

        if (!payerMembership) {
            return res.status(400).json({ error: 'The selected payer is not part of this trip' });
        }

        const splitJson = JSON.stringify(Array.isArray(split_among) ? split_among : []);
        const result = await dbRun(
            'INSERT INTO expenses (budget_id, category, amount, currency, description, paid_by, split_among, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, category, amount, currency || 'USD', description, payerId, splitJson, date]
        );

        const expense = await dbGet(
            'SELECT e.*, u.name as payer_name FROM expenses e JOIN users u ON e.paid_by = u.id WHERE e.id = ?',
            [result.lastID]
        );

        res.status(201).json(expense);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all expenses for a budget
router.get('/:id/expenses', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        const { allowed } = await hasBudgetAccess(id, req.user);
        if (!allowed) {
            return res.status(403).json({ error: 'You do not have access to these expenses' });
        }

        const expenses = await dbAll(
            'SELECT e.*, u.name as payer_name FROM expenses e JOIN users u ON e.paid_by = u.id WHERE e.budget_id = ? ORDER BY e.date DESC',
            [id]
        );

        res.json(expenses);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete expense
router.delete('/expenses/:id', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        const expense = await dbGet('SELECT budget_id FROM expenses WHERE id = ?', [id]);
        if (!expense) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        const { allowed } = await hasBudgetAccess(expense.budget_id, req.user);
        if (!allowed) {
            return res.status(403).json({ error: 'You do not have access to delete this expense' });
        }

        await dbRun('DELETE FROM expenses WHERE id = ?', [id]);
        res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Calculate expense splits
router.get('/:id/split', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        const { allowed } = await hasBudgetAccess(id, req.user);
        if (!allowed) {
            return res.status(403).json({ error: 'You do not have access to these settlements' });
        }

        const expenses = await dbAll('SELECT * FROM expenses WHERE budget_id = ?', [id]);
        const balances = {};

        expenses.forEach((expense) => {
            const splitAmong = JSON.parse(expense.split_among || '[]');
            if (splitAmong.length === 0) {
                return;
            }

            const sharePerPerson = expense.amount / splitAmong.length;
            balances[expense.paid_by] = (balances[expense.paid_by] || 0) + expense.amount;

            splitAmong.forEach((userId) => {
                balances[userId] = (balances[userId] || 0) - sharePerPerson;
            });
        });

        const settlements = [];
        const debtors = [];
        const creditors = [];

        Object.entries(balances).forEach(([userId, balance]) => {
            if (balance < -0.01) {
                debtors.push({ userId: Number(userId), amount: -balance });
            } else if (balance > 0.01) {
                creditors.push({ userId: Number(userId), amount: balance });
            }
        });

        debtors.forEach((debtor) => {
            let remaining = debtor.amount;
            creditors.forEach((creditor) => {
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

        const userIds = [...new Set(settlements.flatMap((settlement) => [settlement.from, settlement.to]))];
        if (userIds.length === 0) {
            return res.json({ balances, settlements: [] });
        }

        const placeholders = userIds.map(() => '?').join(',');
        const users = await dbAll(
            `SELECT id, name FROM users WHERE id IN (${placeholders})`,
            userIds
        );

        const userMap = {};
        users.forEach((user) => {
            userMap[user.id] = user.name;
        });

        settlements.forEach((settlement) => {
            settlement.fromName = userMap[settlement.from];
            settlement.toName = userMap[settlement.to];
        });

        res.json({ balances, settlements });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Settle up (record a payment)
router.post('/settle', verifyToken, async (req, res) => {
    const { budget_id, from_user, to_user, amount, currency } = req.body;

    if (!budget_id || !from_user || !to_user || !amount) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    if (Number(from_user) !== req.user.id) {
        return res.status(403).json({ error: 'You can only record settlements for yourself' });
    }

    try {
        const { budget, allowed } = await hasBudgetAccess(budget_id, req.user);
        if (!allowed) {
            return res.status(403).json({ error: 'You do not have access to settle this budget' });
        }

        const recipientMembership = await dbGet(
            'SELECT id FROM trip_members WHERE trip_id = ? AND user_id = ?',
            [budget.trip_id, to_user]
        );

        if (!recipientMembership) {
            return res.status(400).json({ error: 'The recipient is not part of this trip' });
        }

        await dbRun(
            'INSERT INTO expenses (budget_id, category, amount, currency, description, paid_by, split_among, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
                budget_id,
                'Settlement',
                amount,
                currency || 'USD',
                'Payment to settle debt',
                from_user,
                JSON.stringify([to_user]),
                new Date().toISOString().split('T')[0]
            ]
        );

        res.json({ success: true, message: 'Settlement recorded' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
