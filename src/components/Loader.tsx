import React from 'react';

interface LoaderProps {
    text?: string;
    subText?: string;
}

export default function Loader({ text = "Loading...", subText = "Please wait a moment" }: LoaderProps) {
    return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-4">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-100 rounded-full"></div>
                <div className="w-16 h-16 border-4 border-transparent border-t-blue-600 rounded-full animate-spin absolute top-0 left-0"></div>
            </div>
            <p className="mt-6 text-gray-600 font-medium">{text}</p>
            {subText && <p className="text-sm text-gray-400 mt-2">{subText}</p>}
        </div>
    );
}
