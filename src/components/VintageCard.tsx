import React from "react";

type VintageCardProps = {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
};

export default function VintageCard({ title, description, children, className = "" }: VintageCardProps) {
  return (
    <div
      className={
        "relative max-w-md w-full bg-amber-50 text-zinc-900 border-2 border-zinc-900 rounded-none " +
        "shadow-[8px_8px_0_0_#111] p-6 overflow-hidden " +
        className
      }
    >
      <div className="absolute inset-0 pointer-events-none [background:repeating-linear-gradient(45deg,transparent,transparent_6px,rgba(0,0,0,.04)_6px,rgba(0,0,0,.04)_12px)]" />
      <div className="relative">
        <h3 className="text-2xl font-black tracking-wider uppercase">{title}</h3>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-zinc-700">{description}</p>
        ) : null}
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
    </div>
  );
}


