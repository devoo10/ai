/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { UserGroupIcon, CurrencyDollarIcon, PhotoIcon, InboxStackIcon } from './icons';
import { type Transaction, type User } from '../App';

interface AdminDashboardProps {
    users: User[];
    pendingTransactions: Transaction[];
    onApproveTransaction: (txId: string, credits: number) => void;
    onRejectTransaction: (txId: string) => void;
    onToggleUserStatus: (userId: string) => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ users, pendingTransactions, onApproveTransaction, onRejectTransaction, onToggleUserStatus }) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'transactions' | 'users'>('users');
  
  const totalGenerations = users.reduce((sum, user) => sum + (user.credits < 3 ? (3-user.credits) : 0), 0);
  const totalRevenue = users.reduce((sum, user) => {
    // A simple simulation: assume any credits above the initial 3 are "purchased"
    const purchasedCredits = Math.max(0, user.credits - 3);
    // Rough estimate based on packages
    return sum + (purchasedCredits * 6.67);
  }, 0);


  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in">
      <div className="bg-gray-900/50 border border-gray-700/50 rounded-2xl p-6 md:p-8 flex flex-col text-white shadow-2xl shadow-blue-500/10 backdrop-blur-sm">
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="text-3xl font-bold">Admin Dashboard</h2>
          <a href="/#" className="text-gray-400 hover:text-white transition-colors text-sm font-medium">← Back to Editor</a>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700 mb-4 flex-shrink-0">
            <button 
                onClick={() => setActiveTab('stats')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'stats' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
                Platform Stats
            </button>
             <button 
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'users' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
                Users
            </button>
            <button 
                onClick={() => setActiveTab('transactions')}
                className={`relative px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'transactions' ? 'border-b-2 border-blue-500 text-white' : 'text-gray-400 hover:text-white'}`}
            >
                Pending Transactions
                {pendingTransactions.length > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                        {pendingTransactions.length}
                    </span>
                )}
            </button>
        </div>

        {/* Content Area */}
        <div className="flex-grow">
            {activeTab === 'stats' && (
                <div className="animate-fade-in">
                    {/* Stat Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex items-center gap-4">
                            <UserGroupIcon className="w-8 h-8 text-blue-400"/>
                            <div>
                                <h3 className="text-sm font-medium text-gray-400">Total Users</h3>
                                <p className="text-2xl font-semibold">{users.length}</p>
                            </div>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex items-center gap-4">
                            <PhotoIcon className="w-8 h-8 text-green-400"/>
                            <div>
                                <h3 className="text-sm font-medium text-gray-400">Total Generations</h3>
                                <p className="text-2xl font-semibold">{totalGenerations}</p>
                            </div>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex items-center gap-4">
                            <InboxStackIcon className="w-8 h-8 text-orange-400"/>
                            <div>
                                <h3 className="text-sm font-medium text-gray-400">Pending Transactions</h3>
                                <p className="text-2xl font-semibold">{pendingTransactions.length}</p>
                            </div>
                        </div>
                        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex items-center gap-4">
                            <CurrencyDollarIcon className="w-8 h-8 text-yellow-400"/>
                            <div>
                                <h3 className="text-sm font-medium text-gray-400">Simulated Revenue</h3>
                                <p className="text-2xl font-semibold">${totalRevenue.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {activeTab === 'users' && (
                 <div className="animate-fade-in">
                    <div className="bg-black/20 rounded-lg border border-gray-700/50 overflow-auto max-h-[50vh]">
                        <table className="w-full text-left">
                            <thead className="bg-gray-800 sticky top-0">
                                <tr className="border-b border-gray-700">
                                    <th className="p-3 text-sm font-semibold text-gray-300">Email</th>
                                    <th className="p-3 text-sm font-semibold text-gray-300">Credits</th>
                                    <th className="p-3 text-sm font-semibold text-gray-300">Status</th>
                                    <th className="p-3 text-sm font-semibold text-gray-300">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-800/50">
                                        <td className="p-3 text-sm text-gray-200">{user.email}</td>
                                        <td className="p-3 text-sm text-gray-200">{user.credits}</td>
                                        <td className="p-3 text-sm">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.isEnabled ? 'bg-green-600/30 text-green-300' : 'bg-red-600/30 text-red-300'}`}>
                                                {user.isEnabled ? 'Active' : 'Disabled'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-sm">
                                            <button 
                                                onClick={() => onToggleUserStatus(user.id)} 
                                                className={`font-semibold px-3 py-1 rounded text-xs transition-colors ${user.isEnabled ? 'bg-yellow-600 hover:bg-yellow-500 text-white' : 'bg-sky-600 hover:bg-sky-500 text-white'}`}
                                            >
                                                {user.isEnabled ? 'Disable' : 'Enable'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {activeTab === 'transactions' && (
                <div className="animate-fade-in">
                    {pendingTransactions.length === 0 ? (
                        <div className="text-center py-16">
                            <p className="text-gray-400">No pending transactions to review.</p>
                        </div>
                    ) : (
                        <div className="bg-black/20 rounded-lg border border-gray-700/50 overflow-auto max-h-[50vh]">
                            <table className="w-full text-left">
                                <thead className="bg-gray-800 sticky top-0">
                                    <tr className="border-b border-gray-700">
                                        <th className="p-3 text-sm font-semibold text-gray-300">User Email</th>
                                        <th className="p-3 text-sm font-semibold text-gray-300">Package</th>
                                        <th className="p-3 text-sm font-semibold text-gray-300">Screenshot</th>
                                        <th className="p-3 text-sm font-semibold text-gray-300">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {pendingTransactions.map(tx => (
                                        <tr key={tx.id} className="hover:bg-gray-800/50">
                                            <td className="p-3 text-sm text-gray-200">{tx.userEmail}</td>
                                            <td className="p-3 text-sm text-gray-200">{tx.creditsAmount} credits ({tx.price})</td>
                                            <td className="p-3 text-sm">
                                                <a href={tx.screenshotDataUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">View</a>
                                            </td>
                                            <td className="p-3 text-sm space-x-2">
                                                <button onClick={() => onApproveTransaction(tx.id, tx.creditsAmount)} className="bg-green-600 hover:bg-green-500 text-white font-semibold px-3 py-1 rounded text-xs transition-colors">Approve</button>
                                                <button onClick={() => onRejectTransaction(tx.id)} className="bg-red-600 hover:bg-red-500 text-white font-semibold px-3 py-1 rounded text-xs transition-colors">Reject</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
export default AdminDashboard;