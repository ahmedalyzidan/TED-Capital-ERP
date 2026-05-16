import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Granular Permission Checker Component
 * Selectively hides/shows UI elements based on user permissions
 */
export const Can = ({ resource, action, children, fallback = null }) => {
    const { user } = useAuth();
    
    if (!user) return fallback;
    
    // Super Admin Bypass
    if (user.isSuperAdmin || user.role?.toLowerCase() === 'super admin') return <>{children}</>;
    
    // Check granular permissions
    const hasPermission = user.permissions?.some(p => 
        (p.resource === resource && p.action === action) || 
        (typeof p === 'string' && p === `${resource}:${action}`)
    );
    
    return hasPermission ? <>{children}</> : fallback;
};

/**
 * Protected Route Guard for React Router
 * Secures entire pages based on resource/action requirements
 */
export const RBACProtectedRoute = ({ children, resource, action }) => {
    const { user, token } = useAuth();
    const location = useLocation();

    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (!user) return null; // Wait for user data

    // Super Admin Bypass
    if (user.isSuperAdmin || user.role?.toLowerCase() === 'super admin') return children;

    // Check granular permissions
    const hasPermission = user.permissions?.some(p => 
        (p.resource === resource && p.action === action) || 
        (typeof p === 'string' && p === `${resource}:${action}`)
    );

    if (!hasPermission) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-10 text-center bg-slate-50">
                <div className="text-9xl mb-8">🚫</div>
                <h1 className="text-5xl font-black text-slate-900 mb-4">403 - Access Denied</h1>
                <p className="text-xl text-slate-500 font-bold max-w-lg mb-8">
                    You do not have the required permissions ({resource}:{action}) to access this module. 
                    Please contact your system administrator.
                </p>
                <button 
                    onClick={() => window.history.back()}
                    className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black shadow-xl hover:scale-105 transition-all"
                >
                    Go Back
                </button>
            </div>
        );
    }

    return children;
};
