import React from 'react';
import { Trophy, Medal, Award, User } from 'lucide-react';
import { Lead } from '../types';

interface SellerBadgeProps {
  leads: Lead[];
  currentUser: string;
}

export const SellerBadge: React.FC<SellerBadgeProps> = ({ leads, currentUser }) => {
  const sellerStats = Array.from(new Set(leads.map(l => l.vendedor).filter(Boolean))).map(seller => {
    const sellerLeads = leads.filter(l => l.vendedor === seller);
    const closedSales = sellerLeads.filter(l => l.estatus === 'CERRADO_VENTA' || l.estatus === 'CERRADO').length;
    const totalLeads = sellerLeads.length;
    const efficiency = totalLeads > 0 ? (closedSales / totalLeads) * 100 : 0;
    
    return { name: seller!, efficiency };
  }).sort((a, b) => b.efficiency - a.efficiency);

  const rank = sellerStats.findIndex(s => s.name === currentUser);
  if (rank === -1) return null;

  const getMedalIcon = () => {
    if (rank === 0) return <Trophy className="w-4 h-4 text-yellow-500 fill-yellow-500" />;
    if (rank === 1) return <Medal className="w-4 h-4 text-zinc-400 fill-zinc-400" />;
    if (rank === 2) return <Award className="w-4 h-4 text-amber-700 fill-amber-700" />;
    return <User className="w-4 h-4 text-blue-500" />;
  };

  const getRankText = () => {
    if (rank === 0) return 'Top 1';
    if (rank === 1) return 'Top 2';
    if (rank === 2) return 'Top 3';
    return `${rank + 1}º`;
  };

  return (
    <div className="inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-zinc-200 shadow-sm text-xs font-bold text-zinc-700">
      {getMedalIcon()}
      <span>{getRankText()} en Efectividad</span>
    </div>
  );
};
