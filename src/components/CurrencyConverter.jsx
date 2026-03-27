import React, { useState } from 'react';
import { API_URL } from '../config';
import './CurrencyConverter.css';

const CurrencyConverter = ({ baseCurrency }) => {
    const [amount, setAmount] = useState(100);
    const [from, setFrom] = useState(baseCurrency || 'USD');
    const [to, setTo] = useState('EUR');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const currencies = [
        { code: 'USD', name: 'US Dollar', symbol: '$' },
        { code: 'EUR', name: 'Euro', symbol: '€' },
        { code: 'GBP', name: 'British Pound', symbol: '£' },
        { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
        { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
        { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
        { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
        { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
        { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
        { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
    ];

    const convertCurrency = async () => {
        if (!amount || amount <= 0) return;

        setLoading(true);
        try {
            const response = await fetch(
                `${API_URL}/api/budgets/currency/convert?from=${from}&to=${to}&amount=${amount}`
            );
            const data = await response.json();
            setResult(data);
        } catch (error) {
            console.error('Error converting currency:', error);
        } finally {
            setLoading(false);
        }
    };

    const swap = () => {
        setFrom(to);
        setTo(from);
        setResult(null);
    };

    return (
        <div className="currency-converter glass">
            <h3>💱 Currency Converter</h3>

            <div className="converter-form">
                <div className="form-row">
                    <div className="form-group">
                        <label>Amount</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="100"
                        />
                    </div>

                    <div className="form-group">
                        <label>From</label>
                        <select value={from} onChange={(e) => { setFrom(e.target.value); setResult(null); }}>
                            {currencies.map(c => (
                                <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                            ))}
                        </select>
                    </div>

                    <button type="button" className="swap-btn" onClick={swap} title="Swap currencies">
                        ⇄
                    </button>

                    <div className="form-group">
                        <label>To</label>
                        <select value={to} onChange={(e) => { setTo(e.target.value); setResult(null); }}>
                            {currencies.map(c => (
                                <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <button
                    onClick={convertCurrency}
                    className="btn-primary convert-btn"
                    disabled={loading}
                >
                    {loading ? 'Converting...' : 'Convert'}
                </button>

                {result && (
                    <div className="conversion-result">
                        <div className="result-display">
                            <span className="from-amount">{result.amount} {result.from}</span>
                            <span className="equals">=</span>
                            <span className="to-amount">{result.converted} {result.to}</span>
                        </div>
                        <p className="exchange-rate">
                            Exchange rate: 1 {result.from} = {result.rate.toFixed(4)} {result.to}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CurrencyConverter;
