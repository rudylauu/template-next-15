"use client";

import React from "react";

type VintageButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label?: string;
};

export default function VintageButton({ label = "Comprar", className = "", ...props }: VintageButtonProps) {
  return (
    <button
      className={
        "relative inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold " +
        "bg-amber-100 text-zinc-900 border border-zinc-900 rounded-none shadow-[4px_4px_0_0_#111] " +
        "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#111] active:translate-x-0 active:translate-y-0 active:shadow-[3px_3px_0_0_#111] " +
        "transition-all duration-150 ease-out tracking-wide uppercase " +
        className
      }
      {...props}
    >
      {label}
    </button>
  );
}


