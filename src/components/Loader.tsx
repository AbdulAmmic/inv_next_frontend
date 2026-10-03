import React from 'react';

interface LoaderProps {
    text?: string;
    subText?: string;
}

export default function Loader({ text = "Loading...", subText = "Please wait a moment" }: LoaderProps) {
    return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-4 animate-fade-in">
            <div className="relative w-11 h-11">
                <div className="absolute inset-0 rounded-full border-[3px] border-amber-100" />
                <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-amber-500 animate-spin" />
            </div>
            <p className="mt-5 text-sm text-slate-700 font-semibold">{text}</p>
            {subText && <p className="text-xs text-slate-400 mt-1">{subText}</p>}
        </div>
    );
}
