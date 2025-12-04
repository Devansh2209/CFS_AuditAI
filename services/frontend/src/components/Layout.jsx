import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Receipt, Settings, ShieldCheck, LogOut, Bell, Search } from 'lucide-react';

const Layout = ({ children }) => {
    const location = useLocation();

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: Receipt, label: 'Transactions', path: '/transactions' },
        { icon: ShieldCheck, label: 'Compliance', path: '/compliance' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    return (
        <div className="flex h-screen bg-body overflow-hidden">
            {/* Sidebar */}
            <div className="sidebar">
                <div className="mb-8 px-2">
                    <h1 className="text-2xl font-bold flex items-center gap-3 tracking-tight">
                        <div className="w-8 h-8 bg-accent-blue text-white rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <ShieldCheck size={20} strokeWidth={3} />
                        </div>
                        <span className="text-primary">AuditAI</span>
                    </h1>
                </div>

                <nav className="flex-1 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`nav-item ${isActive ? 'active' : ''}`}
                            >
                                <Icon size={20} className={isActive ? 'text-accent-blue' : 'text-secondary'} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="pt-6 border-t border-gray-100">
                    <div className="p-4 bg-white/60 rounded-xl mb-4 border border-white/60 shadow-sm backdrop-blur-sm group cursor-pointer hover:bg-white/80 transition-all">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                                DS
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-primary truncate">Devansh Soni</p>
                                <p className="text-xs text-secondary truncate">Administrator</p>
                            </div>
                            <Settings size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    </div>
                    <button className="nav-item text-accent-red hover:bg-red-50 w-full justify-start">
                        <LogOut size={20} />
                        Sign Out
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
                {/* Glass Header */}
                <header className="h-16 px-8 flex justify-between items-center bg-white/40 backdrop-blur-md border-b border-white/20 sticky top-0 z-20">
                    <h2 className="text-xl font-semibold text-primary tracking-tight">
                        {navItems.find(i => i.path === location.pathname)?.label || 'Overview'}
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="pl-9 pr-4 py-1.5 rounded-full bg-white/50 border border-transparent focus:bg-white focus:border-accent-blue/30 focus:shadow-sm outline-none text-sm w-64 transition-all"
                            />
                        </div>
                        <button className="p-2 text-secondary hover:text-primary hover:bg-white/50 rounded-full transition-colors relative">
                            <Bell size={20} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-red rounded-full border-2 border-white"></span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-8 relative">
                    <div className="max-w-7xl mx-auto space-y-8 pb-10">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
