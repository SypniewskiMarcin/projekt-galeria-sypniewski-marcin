import React from 'react';

const ProgressBar = ({ progress, message }) => {
    return (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm w-full" 
             role="progressbar" 
             aria-valuenow={progress} 
             aria-valuemin="0" 
             aria-valuemax="100">
            <div className="mb-2 flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">{message}</span>
                <span className="text-sm font-medium text-gray-700">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-in-out"
                     style={{ width: `${progress}%` }}></div>
            </div>
        </div>
    );
};

export default ProgressBar; 