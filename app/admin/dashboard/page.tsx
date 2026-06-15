"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Store, CheckCircle, XCircle } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });

  useEffect(() => {
    fetch("/api/admin/restaurants")
      .then((r) => r.json())
      .then((data: { is_active: boolean }[]) => {
        const active = data.filter((r) => r.is_active).length;
        setStats({ total: data.length, active, inactive: data.length - active });
      });
  }, []);

  const cards = [
    { label: "Total Restaurants", value: stats.total, icon: Store, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Active", value: stats.active, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
    { label: "Inactive", value: stats.inactive, icon: XCircle, color: "text-gray-500", bg: "bg-gray-100" },
  ];

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back, Admin</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {cards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-500">{label}</p>
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                <Icon size={18} className={color} />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">Manage Restaurants</p>
            <p className="text-sm text-gray-500 mt-0.5">Add, edit or remove restaurant listings</p>
          </div>
          <Link
            href="/admin/restaurants"
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ background: "#ea580c" }}
          >
            Go to Restaurants
          </Link>
        </div>
      </div>
    </div>
  );
}
