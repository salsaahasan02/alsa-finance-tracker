import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const DB_NAME = 'AlsaFinanceDB';
const STORE_NAME = 'transactions';

export default function FinanceTracker() {
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('expense');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [dbReady, setDbReady] = useState(false);

  // Initialize IndexedDB
  useEffect(() => {
    const initDB = () => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onerror = () => console.error('DB failed to open');
      request.onsuccess = () => {
        const db = request.result;
        loadTransactionsFromDB(db);
        setDbReady(true);
      };

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    };

    initDB();
  }, []);

  // Load data dari IndexedDB
  const loadTransactionsFromDB = (db) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      setTransactions(request.result.sort((a, b) => b.id - a.id));
    };
  };

  // Save ke IndexedDB
  const saveToIndexedDB = (transactionData) => {
    const request = indexedDB.open(DB_NAME);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.add(transactionData);
    };
  };

  // Delete dari IndexedDB
  const deleteFromIndexedDB = (id) => {
    const request = indexedDB.open(DB_NAME);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.delete(id);
    };
  };

  const addTransaction = () => {
    if (!amount || !description || !category) {
      alert('Isi semua field!');
      return;
    }

    const newTransaction = {
      id: Date.now(),
      amount: parseFloat(amount),
      category,
      description,
      type,
      date: new Date().toISOString().slice(0, 10)
    };

    saveToIndexedDB(newTransaction);
    setTransactions([newTransaction, ...transactions]);
    setAmount('');
    setDescription('');
    setCategory('');
  };

  const deleteTransaction = (id) => {
    deleteFromIndexedDB(id);
    setTransactions(transactions.filter(t => t.id !== id));
  };

  // Export data sebagai JSON file
  const exportData = () => {
    const dataStr = JSON.stringify(transactions, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alsa-finance-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
  };

  // Import data dari JSON file
  const importData = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (Array.isArray(importedData)) {
          const request = indexedDB.open(DB_NAME);
          request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction(STORE_NAME, 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            
            importedData.forEach(item => {
              store.add(item);
            });

            setTransactions([...importedData, ...transactions]);
            alert('Data berhasil diimport!');
          };
        }
      } catch (error) {
        alert('Format file tidak valid!');
      }
    };
    reader.readAsText(file);
  };

  // Filter transaksi berdasarkan bulan
  const filteredTransactions = transactions.filter(t => t.date.startsWith(selectedMonth));

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  // Data untuk pie chart
  const expenseByCategory = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      const existing = acc.find(item => item.name === t.category);
      if (existing) {
        existing.value += t.amount;
      } else {
        acc.push({ name: t.category, value: t.amount });
      }
      return acc;
    }, []);

  const incomeByCategory = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => {
      const existing = acc.find(item => item.name === t.category);
      if (existing) {
        existing.value += t.amount;
      } else {
        acc.push({ name: t.category, value: t.amount });
      }
      return acc;
    }, []);

  const COLORS = ['#ec4899', '#f472b6', '#fbcfe8', '#fce7f3', '#fda4af', '#ff69b4'];
  const INCOME_COLORS = ['#10b981', '#6ee7b7', '#a7f3d0', '#d1fae5', '#ecfdf5'];

  const monthlyData = [
    { name: 'Pemasukan', value: totalIncome, fill: '#10b981' },
    { name: 'Pengeluaran', value: totalExpense, fill: '#ec4899' }
  ];

  if (!dbReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100 flex items-center justify-center">
        <p className="text-pink-600 text-xl font-bold">Loading database...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-pink-600 mb-2">🌸 Alsa Finance Tracker</h1>
          <p className="text-pink-500 text-lg">🌸 Manage your money smartly 🌸</p>
        </div>

        {/* MONTH SELECTOR & EXPORT/IMPORT */}
        <div className="bg-white rounded-lg shadow-lg p-4 mb-8 border-2 border-pink-200">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-4">
            <div>
              <label className="text-pink-600 font-bold mr-3">Pilih Bulan:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 border-2 border-pink-300 rounded-lg focus:outline-none focus:border-pink-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={exportData}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold transition"
              >
                Export Data
              </button>
              <label className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-bold cursor-pointer transition">
                Import Data
                <input
                  type="file"
                  accept=".json"
                  onChange={importData}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* BALANCE CARD */}
        <div className="bg-gradient-to-r from-pink-400 to-rose-400 rounded-lg shadow-lg p-8 mb-8 text-white">
          <p className="text-pink-100 text-lg">Total Saldo</p>
          <h2 className="text-4xl font-bold my-3">
            Rp {balance.toLocaleString('id-ID')}
          </h2>
          
          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t-2 border-pink-200">
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <p className="text-pink-100 text-sm">Pemasukan Bulan Ini</p>
              <p className="text-2xl font-bold">
                Rp {totalIncome.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4">
              <p className="text-pink-100 text-sm">Pengeluaran Bulan Ini</p>
              <p className="text-2xl font-bold">
                Rp {totalExpense.toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </div>

        {/* CHARTS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* INCOME vs EXPENSE BAR CHART */}
          <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-pink-200">
            <h3 className="text-xl font-bold text-pink-600 mb-4">📊 Perbandingan</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#fce7f3" />
                <XAxis dataKey="name" stroke="#ec4899" />
                <YAxis stroke="#ec4899" />
                <Tooltip 
                  formatter={(value) => `Rp ${value.toLocaleString('id-ID')}`}
                  contentStyle={{ backgroundColor: '#fdf2f8', border: '2px solid #ec4899' }}
                />
                <Bar dataKey="value" fill="#ec4899" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* EXPENSE PIE CHART */}
          {expenseByCategory.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-pink-200">
              <h3 className="text-xl font-bold text-pink-600 mb-4">💸 Pengeluaran per Kategori</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expenseByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: Rp ${(value/1000000).toFixed(1)}jt`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expenseByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `Rp ${value.toLocaleString('id-ID')}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* INCOME PIE CHART */}
          {incomeByCategory.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-pink-200">
              <h3 className="text-xl font-bold text-pink-600 mb-4">💰 Pemasukan per Kategori</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={incomeByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: Rp ${(value/1000000).toFixed(1)}jt`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {incomeByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={INCOME_COLORS[index % INCOME_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `Rp ${value.toLocaleString('id-ID')}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* INPUT FORM */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border-2 border-pink-200">
          <h3 className="text-xl font-bold text-pink-600 mb-4">➕ Tambah Transaksi</h3>

          <div className="space-y-4">
            {/* Type Selection */}
            <div className="flex gap-2">
              <button
                onClick={() => setType('expense')}
                className={`flex-1 py-2 rounded font-bold transition ${
                  type === 'expense'
                    ? 'bg-pink-500 text-white'
                    : 'bg-pink-100 text-pink-600'
                }`}
              >
                Pengeluaran
              </button>
              <button
                onClick={() => setType('income')}
                className={`flex-1 py-2 rounded font-bold transition ${
                  type === 'income'
                    ? 'bg-green-500 text-white'
                    : 'bg-green-100 text-green-600'
                }`}
              >
                Pemasukan
              </button>
            </div>

            {/* Amount Input */}
            <input
              type="number"
              placeholder="Jumlah uang"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border-2 border-pink-300 rounded focus:outline-none focus:border-pink-500"
            />

            {/* Category Input */}
            <input
              type="text"
              placeholder="Kategori (misal: makanan, transport, gaji)"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border-2 border-pink-300 rounded focus:outline-none focus:border-pink-500"
            />

            {/* Description Input */}
            <input
              type="text"
              placeholder="Keterangan"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border-2 border-pink-300 rounded focus:outline-none focus:border-pink-500"
            />

            {/* Add Button */}
            <button
              onClick={addTransaction}
              className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white py-2 rounded font-bold transition transform hover:scale-105"
            >
              Tambah Transaksi
            </button>
          </div>
        </div>

        {/* TRANSACTIONS LIST */}
        <div>
          <h3 className="text-xl font-bold text-pink-600 mb-4">📜 Riwayat Transaksi</h3>
          <div className="space-y-3">
            {filteredTransactions.length === 0 ? (
              <div className="bg-white rounded-lg shadow-lg p-8 text-center text-pink-400 border-2 border-pink-200">
                <p className="text-lg">Belum ada transaksi di bulan ini</p>
              </div>
            ) : (
              filteredTransactions.map(t => (
                <div
                  key={t.id}
                  className="bg-white rounded-lg shadow-lg p-4 flex justify-between items-center border-2 border-pink-200 hover:shadow-xl transition"
                >
                  <div>
                    <p className="font-bold text-gray-800">{t.description}</p>
                    <p className="text-sm text-pink-500">{t.category} • {t.date}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className={`font-bold text-lg ${t.type === 'income' ? 'text-green-600' : 'text-pink-600'}`}>
                      {t.type === 'income' ? '+' : '-'} Rp {t.amount.toLocaleString('id-ID')}
                    </p>
                    <button
                      onClick={() => deleteTransaction(t.id)}
                      className="text-pink-500 hover:text-pink-700 hover:bg-pink-100 px-3 py-1 rounded transition"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
