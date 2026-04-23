'use client';

import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary]', error, info);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-8">
                    <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                        <AlertTriangle size={32} className="text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Terjadi Kesalahan</h2>
                    <p className="text-slate-400 text-sm mb-6 max-w-sm">
                        Halaman ini mengalami error. Coba muat ulang halaman.
                    </p>
                    {this.state.error && (
                        <p className="text-xs text-slate-600 font-mono mb-6 max-w-sm break-all bg-slate-800/50 rounded-xl p-3">
                            {this.state.error.message}
                        </p>
                    )}
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 hover:bg-blue-500/20 transition-colors cursor-pointer text-sm font-medium"
                    >
                        <RefreshCw size={16} />
                        Coba Lagi
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
