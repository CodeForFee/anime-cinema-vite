import React from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-white/5 bg-[#06070A] py-10 px-6 md:px-12 mt-20 text-gray-400 text-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <img
            src="/app-icon.png"
            alt=""
            width={32}
            height={32}
            className="w-8 h-8 rounded-lg"
          />
          <div>
            <p className="font-bold text-white text-sm tracking-wider">
              CAPYNIME
            </p>
            <p className="text-[11px] text-gray-400">
              Trải nghiệm xem Anime chuẩn rạp & Không quảng cáo
            </p>
          </div>
        </div>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-gray-300">
          <Link to="/" className="hover:text-white transition-colors">
            Trang chủ
          </Link>
          <Link to="/explore" className="hover:text-white transition-colors">
            Khám phá
          </Link>
          <Link to="/history" className="hover:text-white transition-colors">
            Lịch sử xem
          </Link>
          <Link to="/favorites" className="hover:text-white transition-colors">
            Yêu thích
          </Link>
          <span className="text-gray-400">|</span>
          <span className="text-gray-400">
            All rights reserved © 2026 Movion
          </span>
        </div>

        {/* Protection Note */}
        <div className="flex items-center gap-1.5 text-gray-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Bảo vệ bởi AnimeShield AdBlock Core</span>
        </div>
      </div>
    </footer>
  );
};
