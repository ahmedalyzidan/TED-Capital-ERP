import { useState, useEffect, createContext, useContext } from 'react';
import api from '../services/api';

const SecurityContext = createContext();

export const SecurityProvider = ({ children }) => {
    const [permissions, setPermissions] = useState([]);
    const [orgUnits, setOrgUnits] = useState([]);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const res = await api.get('/iam/metadata');
                setPermissions(res.data.permissions || []);
                setOrgUnits(res.data.orgUnits || []);
                setIsSuperAdmin(res.data.isSuperAdmin || false);
            } catch (err) {
                console.error("IAM Metadata fetch failed", err);
            } finally {
                setLoading(false);
            }
        };

        if (localStorage.getItem('token')) {
            fetchMetadata();
        } else {
            setLoading(false);
        }
    }, []);

    const hasPermission = (code) => isSuperAdmin || (permissions && Array.isArray(permissions) && permissions.includes(code));

    return (
        <SecurityContext.Provider value={{ permissions, orgUnits, isSuperAdmin, hasPermission, loading }}>
            {children}
        </SecurityContext.Provider>
    );
};

export const useSecurity = () => useContext(SecurityContext);
